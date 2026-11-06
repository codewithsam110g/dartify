import { isGloballyVisible, Symbol, SymbolFacet } from "@/symbol";
import { logicalNameOfFQN, sourceFileOfFQN } from "@/symbol/fqn";
import { SemanticReport } from "./types";

/**
 * Where each file stands in the run's deterministic file order (inputs, then
 * dependencies, each sorted). A cold run and a watch rebuild hand the same
 * order to the same pass, so both pick the same owner for a merged global.
 */
export type FileOrder = ReadonlyMap<string, number>;

/**
 * Whether a facet is a global declaration TypeScript merges across files: a
 * script file's declaration or one inside `declare global`. Hoisted anonymous
 * shapes are implementation detail of the declaration that owns them and never
 * merge.
 */
export function isGlobalMergeable(facet: SymbolFacet): boolean {
  return facet.synthetic !== "anonymousType" && isGloballyVisible(facet);
}

/** Whether any declaration of these groups takes part in cross-file merging. */
export function declaresMergeableGlobals(
  groups: Iterable<readonly Symbol[]>,
): boolean {
  for (const group of groups) {
    for (const symbol of group) {
      if (symbol.facets.some(isGlobalMergeable)) return true;
    }
  }
  return false;
}

function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Merges global declarations that TypeScript treats as one symbol across files
 * (HD-06): `interface Settings` in two script files, or in a script file and a
 * `declare global` block.
 *
 * The first declaring file in `order` owns the symbol. Every other file's
 * parts move into the owner's group, after the owner's own, in file order, so
 * the existing per-group merge rules (D-12) see all parts together; a file left
 * with nothing of that name emits no partial declaration, and references to it
 * are redirected to the owner. The pass is a pure function of the declarations
 * and `order`: it makes the same choice for the whole program and for any
 * subset that holds every file declaring a global (the watch session's
 * cluster), which is what keeps a rebuild equal to a cold run (D-16).
 */
export function mergeGlobalDeclarations(
  draft: Map<string, Symbol[]>,
  report: SemanticReport,
  redirects: Map<string, string>,
  order: FileOrder = new Map(),
): void {
  const rank = (file: string): number => order.get(file) ?? Number.MAX_SAFE_INTEGER;
  const byName = new Map<string, string[]>();
  for (const [fqn, group] of draft) {
    if (!group[0]?.facets.some(isGlobalMergeable)) continue;
    const logical = logicalNameOfFQN(fqn);
    const list = byName.get(logical) ?? [];
    list.push(fqn);
    byName.set(logical, list);
  }

  for (const logical of [...byName.keys()].sort(compareCodeUnits)) {
    const fqns = byName.get(logical)!;
    if (fqns.length < 2) continue;
    fqns.sort((a, b) => {
      const fileA = sourceFileOfFQN(a);
      const fileB = sourceFileOfFQN(b);
      return rank(fileA) - rank(fileB) || compareCodeUnits(fileA, fileB);
    });
    const [ownerFQN, ...others] = fqns;
    const owner = draft.get(ownerFQN)![0];
    let nextOrder =
      Math.max(-1, ...owner.facets.map((facet) => facet.origin.sourceOrder)) + 1;
    const gathered: SymbolFacet[] = [...owner.facets];

    for (const fqn of others) {
      const symbol = draft.get(fqn)![0];
      const moved = symbol.facets
        .filter(isGlobalMergeable)
        .sort((a, b) => a.origin.sourceOrder - b.origin.sourceOrder);
      const kept = symbol.facets.filter((facet) => !isGlobalMergeable(facet));
      // Appended after the owner's own parts, so the owner's declaration keeps
      // its place in its library and in merge order.
      for (const facet of moved) {
        facet.origin = { ...facet.origin, sourceOrder: nextOrder++ };
        gathered.push(facet);
      }
      if (kept.length > 0) {
        symbol.facets = kept;
        continue;
      }
      draft.delete(fqn);
      redirects.set(fqn, ownerFQN);
      report.redirects.push({
        fromFQN: fqn,
        toFQN: ownerFQN,
        reason: "globalMerge",
      });
    }
    owner.facets = gathered;
  }
}
