import { basename } from "path";
import { Symbol } from "@/symbol";
import { sourceFileOfFQN } from "@/symbol/fqn";
import { isAmbientModuleId } from "@/symbol/exports";
import { IRDeclKind } from "@ir/declaration";
import { IREnum } from "@ir/enum";
import { LinkedProgram } from "@engine/phase/linkerPhase";
import { BackendDiagnostic } from "../backend";

/**
 * Where each declaration lives at runtime (HD-17).
 *
 * With a root — `--js-root R`, or a module's own `export as namespace R` — a
 * value's JavaScript path is the root plus the property path an input file
 * exports it under, as the export graph resolved it. Without a root nothing is
 * planned and declarations bind as before. A value no input exports keeps
 * `R.<local name>` and is reported; two different values at one path are
 * reported too. Paths are decided once per render over the whole program,
 * because one library's path depends on another file's export list.
 */
export interface RoutePlan {
  /** The path export routes decide for a declaration, when a rooted one exists. */
  routed(fqn: string): string | undefined;
  /**
   * The path under which `entry` exports a declaration as `name`: where a
   * public name's own binding points (HD-18).
   */
  routedAs(fqn: string, entry: string, name: string): string | undefined;
  /** A declaration needing a runtime path that no input exports. */
  isMissing(fqn: string): boolean;
  /** Path conflicts, attributed to the library of the first declaration involved. */
  conflictsOf(file: string): readonly BackendDiagnostic[];
  /** Everything the plan contributes to one library, for the render cache. */
  keyOf(file: string): string;
}

/** The first `export as namespace` alias a file declares. */
export function umdRootOf(program: LinkedProgram, file: string): string | undefined {
  const aliases = program.namespaceExports.get(file);
  return aliases && aliases.size > 0 ? [...aliases].sort()[0] : undefined;
}

/** Whether binding this symbol calls a JavaScript object (types alone have none). */
export function needsRuntimePath(symbol: Symbol): boolean {
  return symbol.facets.some((facet) => {
    if (!facet.emit || facet.ir.modifiers.isAnonymousDefault) return false;
    switch (facet.ir.kind) {
      case IRDeclKind.Class:
      case IRDeclKind.Function:
      case IRDeclKind.Variable:
        return true;
      case IRDeclKind.Enum:
        return !(facet.ir as IREnum).isConst;
      case IRDeclKind.Interface:
        return facet.namespace === "both";
      default:
        return false;
    }
  });
}

interface FilePlan {
  paths: [string, string][];
  missing: string[];
  conflicts: BackendDiagnostic[];
}

/** A TypeScript name for messages: `LineUtil.simplify in leaflet.d.ts`. */
function describe(fqn: string): string {
  const logical = fqn.slice(fqn.indexOf("::") + 2).replace(/\|/g, ".");
  return `${logical} in ${basename(sourceFileOfFQN(fqn))}`;
}

export function planRoutes(program: LinkedProgram, jsRoot: string | undefined): RoutePlan {
  const rootOf = (entry: string): string | undefined =>
    isAmbientModuleId(entry) ? jsRoot : umdRootOf(program, entry) ?? jsRoot;

  const routed = new Map<string, string>();
  const missing = new Set<string>();
  const owners = new Map<string, Set<string>>();
  const files = new Map<string, FilePlan>();
  const plan = (file: string): FilePlan => {
    let entry = files.get(file);
    if (!entry) files.set(file, (entry = { paths: [], missing: [], conflicts: [] }));
    return entry;
  };

  for (const [fqn, group] of program.symbols) {
    const symbol = group[0];
    if (!symbol || !needsRuntimePath(symbol)) continue;
    const exportedAt = (program.moduleExports.routes.get(fqn) ?? []).filter((route) => !route.typeOnly);
    const candidates = exportedAt.flatMap((route) => {
      const root = rootOf(route.entry);
      return root ? [[root, ...route.path].join(".")] : [];
    });
    const file = sourceFileOfFQN(fqn);
    if (candidates.length > 0) {
      routed.set(fqn, candidates[0]);
      plan(file).paths.push([fqn, candidates[0]]);
      for (const path of candidates) {
        let set = owners.get(path);
        if (!set) owners.set(path, (set = new Set()));
        set.add(fqn);
      }
      continue;
    }
    // Exported only by inputs that have no root: nothing is known beyond the
    // declaring file's own root, so it binds as it always did.
    if (exportedAt.length > 0) continue;
    // No input exports it. It matters only where it would bind under a root.
    const facet = symbol.facets.find((each) => each.emit);
    if (!facet || facet.origin.scopes.some((scope) => scope.kind === "global")) continue;
    const ambient = facet.origin.scopes[0]?.kind === "externalModule";
    const rooted = ambient
      ? jsRoot !== undefined
      : facet.origin.fileIsModule === true &&
        (umdRootOf(program, facet.origin.filePath) ?? jsRoot) !== undefined;
    if (rooted) {
      missing.add(fqn);
      plan(file).missing.push(fqn);
    }
  }

  for (const [path, fqns] of [...owners].sort(([a], [b]) => a.localeCompare(b))) {
    if (fqns.size < 2) continue;
    const sorted = [...fqns].sort();
    plan(sourceFileOfFQN(sorted[0])).conflicts.push({
      code: "EXPORT_PATH_CONFLICT",
      file: sourceFileOfFQN(sorted[0]),
      name: path,
      message: `${path} is exported by different declarations (${sorted.map(describe).join(", ")}); each binds that path`,
    });
  }

  return {
    routed: (fqn) => routed.get(fqn),
    routedAs: (fqn, entry, name) => {
      const root = rootOf(entry);
      const route = (program.moduleExports.routes.get(fqn) ?? []).find(
        (each) => each.entry === entry && !each.typeOnly && each.path[0] === name,
      );
      return root && route ? [root, ...route.path].join(".") : undefined;
    },
    isMissing: (fqn) => missing.has(fqn),
    conflictsOf: (file) => files.get(file)?.conflicts ?? [],
    // Sorted: the order symbols were registered in is not part of the plan.
    keyOf: (file) => {
      const entry = files.get(file);
      return entry
        ? JSON.stringify({
            paths: [...entry.paths].sort(([a], [b]) => a.localeCompare(b)),
            missing: [...entry.missing].sort(),
            conflicts: entry.conflicts,
          })
        : "";
    },
  };
}
