/**
 * Module export identity (`P-17`, task 4.12) and the export graph (HD-17, HD-18).
 *
 * Declarations carry their own `export`/`export default` modifiers. Everything
 * else a module can export — `export =`, `export default identifier`, export
 * lists, star and namespace re-exports, and the imports an export list names —
 * is recorded here per file as raw records during generation. The linker then
 * resolves them over the whole program, not per file: a named export follows
 * barrel chains and import-then-export to the declaration it really denotes,
 * and every declaration reachable from an input file gets its runtime export
 * route(s). Everything here is a pure function of (records, symbols, inputs),
 * so a cold build and a watch rebuild compute the same graph (D-16, D-20).
 */

import type { Symbol as ProgramSymbol, SymbolFacet } from "@/symbol";

/** Fields every raw record carries. */
interface RecordBase {
  line: number;
  /**
   * Specifier of the ambient module (`declare module "x" { … }`) the statement
   * is written in. Absent when it belongs to the file's own module.
   */
  module?: string;
}

export type ExportRecord =
  | (RecordBase & {
      /** `export = X` (`isDefault: false`) or `export default X` (`true`). */
      kind: "assignment";
      isDefault: boolean;
      /** The expression as written, e.g. `L` or `h3`. */
      expression: string;
    })
  | (RecordBase & {
      /** `export { a, b as c }` with or without `from "m"`. */
      kind: "named";
      elements: { name: string; propertyName?: string; isTypeOnly: boolean }[];
      specifier?: string;
      targetFile?: string;
      isTypeOnly: boolean;
    })
  | (RecordBase & {
      /** `export * from "m"`. */
      kind: "star";
      specifier: string;
      targetFile?: string;
      isTypeOnly: boolean;
    })
  | (RecordBase & {
      /** `export * as ns from "m"`. */
      kind: "namespace";
      alias: string;
      specifier: string;
      targetFile?: string;
      isTypeOnly: boolean;
    });

/**
 * Records that are not exports themselves but that export lists refer to:
 * what an import declaration binds, and which top-level namespaces carry the
 * `export` keyword (a namespace is a scope, not a symbol, so the symbol table
 * cannot say).
 */
export type BindingRecord =
  | (RecordBase & {
      kind: "import";
      /** `imported` is the exported name, `default`, or `*` for a namespace import. */
      bindings: { local: string; imported: string; isTypeOnly: boolean }[];
      specifier: string;
      targetFile?: string;
      isTypeOnly: boolean;
    })
  | (RecordBase & {
      kind: "scope";
      name: string;
      exported: boolean;
    });

export type ModuleExportRecord = ExportRecord | BindingRecord;

/** Run-owned raw records keyed by declaring file. */
export type ModuleExportTable = Map<string, ModuleExportRecord[]>;

/** What one element of an export list denotes once the graph is resolved. */
export interface ResolvedExportElement {
  /** The public name (the alias when the element renames). */
  name: string;
  /** The name it is taken from: the local binding or the target's export. */
  from: string;
  isTypeOnly: boolean;
  /** Declarations it denotes, through barrel chains and imports. */
  fqns: string[];
  /**
   * The file the binding enters this module from, when it is not declared
   * here: the `from` target of a re-export, or the module an imported binding
   * comes from.
   */
  viaFile?: string;
  /** Set when the element names a module namespace (`import * as ns; export { ns }`). */
  namespaceFile?: string;
}

export type ResolvedModuleExport = ExportRecord & {
  /** Every FQN the record binds, in the declaring or target file. */
  targets: string[];
  /** `named` records: each element resolved over the export graph. */
  resolvedElements?: ResolvedExportElement[];
};

export interface ModuleExportDiagnostic {
  code: "MODULE_EXPORT_UNRESOLVED" | "MODULE_EXPORT_TARGET_MISSING";
  file: string;
  line: number;
  message: string;
}

/**
 * One way a declaration is reached at runtime from an input module. Paths are
 * relative to the module's runtime object; the backend decides what that
 * object is called (`--js-root`, `export as namespace`).
 */
export interface ExportRoute {
  /** The input file, or `ambient:<specifier>` for an ambient module an input declares. */
  entry: string;
  /** Property path under the module object; empty for `export =` itself. */
  path: readonly string[];
  /** Reached only through `export type` / `import type`: not a runtime route. */
  typeOnly: boolean;
}

export interface LinkedModuleExports {
  /** File-level export records, resolved. */
  readonly byFile: ReadonlyMap<string, readonly ResolvedModuleExport[]>;
  readonly diagnostics: readonly ModuleExportDiagnostic[];
  /** Runtime routes of every declaration reachable from an input, by FQN, in a deterministic order. */
  readonly routes: ReadonlyMap<string, readonly ExportRoute[]>;
}

const AMBIENT_PREFIX = "ambient:";

export function ambientModuleId(specifier: string): string {
  return `${AMBIENT_PREFIX}${specifier}`;
}

export function isAmbientModuleId(id: string): boolean {
  return id.startsWith(AMBIENT_PREFIX);
}

/** Removes the delimiting quotes of a quoted TypeScript name only. */
function unquote(name: string): string {
  const match = name.match(/^(['"`])([\s\S]*)\1$/);
  return match ? match[2] : name;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function isExportRecord(record: ModuleExportRecord): record is ExportRecord {
  return record.kind !== "import" && record.kind !== "scope";
}

/** Where a symbol lives in the export graph, and its path inside the module. */
interface Placement {
  moduleId: string;
  /** Namespace segments then the declaration's name: `[head, ...rest]`. */
  localPath: string[];
}

function placementOf(facet: SymbolFacet): Placement | undefined {
  const scopes = facet.origin.scopes;
  if (scopes.some((scope) => scope.kind === "global")) return undefined;
  // Hoisted anonymous shapes are implementation detail, never a public name.
  if (facet.synthetic === "anonymousType") return undefined;
  const first = scopes[0];
  let moduleId: string;
  let inner = scopes;
  if (first?.kind === "externalModule") {
    moduleId = ambientModuleId(first.specifier);
    inner = scopes.slice(1);
  } else if (facet.origin.fileIsModule) {
    moduleId = facet.origin.filePath;
  } else {
    // A script file's declarations are globals, not module exports.
    return undefined;
  }
  const namespaces = inner.flatMap((scope) =>
    scope.kind === "namespace" ? scope.jsSegments.map(unquote) : [],
  );
  const name = facet.ir.jsName ?? facet.ir.name;
  return { moduleId, localPath: [...namespaces, unquote(name)] };
}

/** A declaration's path inside its module (`[head, ...rest]`), when it belongs to one. */
export function localPathOf(facet: SymbolFacet): string[] | undefined {
  return placementOf(facet)?.localPath;
}

interface Head {
  fqns: string[];
  /** Some declaration of this name carries the `export` keyword. */
  exported: boolean;
  /** The declaration that is `export default`, if any. */
  defaultFQN?: string;
}

interface ImportBinding {
  specifier: string;
  targetFile?: string;
  imported: string;
  isTypeOnly: boolean;
}

interface ModuleIndex {
  id: string;
  files: Set<string>;
  heads: Map<string, Head>;
  imports: Map<string, ImportBinding>;
  exportedScopes: Set<string>;
  records: ExportRecord[];
}

/** An explicit entry of a module's export table, before it is followed. */
type OwnEntry =
  | { kind: "decl"; fqns: string[]; typeOnly: boolean; derived?: boolean }
  | { kind: "reexport"; target: string; from: string; typeOnly: boolean }
  | { kind: "namespace"; target: string; typeOnly: boolean };

/** What an export name denotes after following re-exports. */
interface Binding {
  fqns: readonly string[];
  namespace?: string;
  typeOnly: boolean;
  derived?: boolean;
}

/** `export *` from two sources that disagree: the name is exported by neither. */
const AMBIGUOUS = "ambiguous";
type Resolved = Binding | typeof AMBIGUOUS | undefined;

function bindingKey(binding: Binding): string {
  return `${binding.namespace ?? ""}\u0000${binding.fqns.join("|")}`;
}

class ExportGraph {
  private readonly modules = new Map<string, ModuleIndex>();
  private readonly placements = new Map<string, Placement>();
  private readonly own = new Map<string, Map<string, OwnEntry>>();
  private readonly equalsOf = new Map<string, Resolved>();

  constructor(
    table: ModuleExportTable,
    symbols: ReadonlyMap<string, readonly ProgramSymbol[]>,
  ) {
    const module = (id: string, file: string): ModuleIndex => {
      let index = this.modules.get(id);
      if (!index) {
        index = {
          id,
          files: new Set(),
          heads: new Map(),
          imports: new Map(),
          exportedScopes: new Set(),
          records: [],
        };
        this.modules.set(id, index);
      }
      index.files.add(file);
      return index;
    };

    for (const fqn of [...symbols.keys()].sort()) {
      for (const symbol of symbols.get(fqn) ?? []) {
        const facet = symbol.facets[0];
        if (!facet || symbol.minted) continue;
        const placement = placementOf(facet);
        if (!placement) continue;
        this.placements.set(fqn, placement);
        const index = module(placement.moduleId, facet.origin.filePath);
        const headName = placement.localPath[0];
        let head = index.heads.get(headName);
        if (!head) index.heads.set(headName, (head = { fqns: [], exported: false }));
        if (!head.fqns.includes(fqn)) head.fqns.push(fqn);
        if (placement.localPath.length !== 1) continue;
        for (const each of symbol.facets) {
          const kind = each.ir.modifiers.exportKind;
          if (kind === "named") head.exported = true;
          if (kind === "default") head.defaultFQN = fqn;
        }
      }
    }

    for (const file of [...table.keys()].sort()) {
      for (const record of table.get(file) ?? []) {
        const id = record.module !== undefined ? ambientModuleId(record.module) : file;
        const index = module(id, file);
        if (record.kind === "import") {
          for (const binding of record.bindings) {
            index.imports.set(binding.local, {
              specifier: record.specifier,
              ...(record.targetFile ? { targetFile: record.targetFile } : {}),
              imported: binding.imported,
              isTypeOnly: record.isTypeOnly || binding.isTypeOnly,
            });
          }
        } else if (record.kind === "scope") {
          if (record.exported) index.exportedScopes.add(record.name);
        } else {
          index.records.push(record);
        }
      }
    }
  }

  moduleIds(): string[] {
    return [...this.modules.keys()].sort();
  }

  filesOf(id: string): ReadonlySet<string> {
    return this.modules.get(id)?.files ?? new Set();
  }

  index(id: string): ModuleIndex | undefined {
    return this.modules.get(id);
  }

  /** The module a re-export or import names: a loaded file, or an ambient module. */
  targetOf(record: { targetFile?: string; specifier?: string }): string | undefined {
    if (record.targetFile) return record.targetFile;
    if (record.specifier !== undefined && this.modules.has(ambientModuleId(record.specifier))) {
      return ambientModuleId(record.specifier);
    }
    return undefined;
  }

  /** The local binding `name` in a module: an import, else a declaration. */
  private local(index: ModuleIndex, name: string): OwnEntry | undefined {
    const imported = index.imports.get(name);
    if (imported) {
      const target = this.targetOf(imported);
      if (!target) return undefined;
      return imported.imported === "*"
        ? { kind: "namespace", target, typeOnly: imported.isTypeOnly }
        : { kind: "reexport", target, from: imported.imported, typeOnly: imported.isTypeOnly };
    }
    const head = index.heads.get(name);
    if (head) return { kind: "decl", fqns: [...head.fqns].sort(), typeOnly: false };
    return undefined;
  }

  /** What `export = X` denotes, when the module has one that resolves. */
  private exportEquals(index: ModuleIndex): Resolved {
    if (this.equalsOf.has(index.id)) return this.equalsOf.get(index.id);
    this.equalsOf.set(index.id, undefined);
    let resolved: Resolved;
    for (const record of index.records) {
      if (record.kind !== "assignment" || record.isDefault) continue;
      const entry = this.local(index, record.expression.split(".")[0]);
      resolved = entry ? this.follow(entry, new Set()) : undefined;
      break;
    }
    this.equalsOf.set(index.id, resolved);
    return resolved;
  }

  /** Explicit export entries of one module, by exported name. */
  private ownEntries(index: ModuleIndex): Map<string, OwnEntry> {
    const cached = this.own.get(index.id);
    if (cached) return cached;
    const entries = new Map<string, OwnEntry>();
    this.own.set(index.id, entries);
    const set = (name: string, entry: OwnEntry | undefined) => {
      if (entry && !entries.has(name)) entries.set(name, entry);
    };

    // TypeScript treats a declaration file or ambient module with no export
    // declarations as an export context: every declaration is exported.
    const implicit = index.records.length === 0;
    for (const [name, head] of [...index.heads].sort(([a], [b]) => a.localeCompare(b))) {
      if (head.defaultFQN) set("default", { kind: "decl", fqns: [head.defaultFQN], typeOnly: false });
      // `export default function f` exports `default`, not `f`.
      const onlyDefault = head.defaultFQN !== undefined && head.fqns.every((fqn) => fqn === head.defaultFQN);
      if (onlyDefault) continue;
      if (head.exported || index.exportedScopes.has(name) || implicit) {
        set(name, { kind: "decl", fqns: [...head.fqns].sort(), typeOnly: false });
      }
    }

    for (const record of index.records) {
      if (record.kind === "assignment") {
        if (record.isDefault && IDENTIFIER.test(record.expression)) {
          set("default", this.local(index, record.expression));
        }
        continue;
      }
      if (record.kind === "namespace") {
        const target = this.targetOf(record);
        if (target) set(record.alias, { kind: "namespace", target, typeOnly: record.isTypeOnly });
        continue;
      }
      if (record.kind !== "named") continue;
      const target = record.specifier !== undefined ? this.targetOf(record) : undefined;
      if (record.specifier !== undefined && !target) continue;
      for (const element of record.elements) {
        const from = element.propertyName ?? element.name;
        const typeOnly = record.isTypeOnly || element.isTypeOnly;
        if (target) {
          set(element.name, { kind: "reexport", target, from, typeOnly });
          continue;
        }
        const entry = this.local(index, from);
        if (entry) set(element.name, { ...entry, typeOnly: typeOnly || entry.typeOnly });
      }
    }

    // `export = ns` also exposes the members of the merged namespace by name.
    const equals = this.exportEquals(index);
    if (equals && equals !== AMBIGUOUS) {
      const groups = new Map<string, string[]>();
      for (const fqn of equals.fqns) {
        const path = this.placements.get(fqn)?.localPath;
        if (!path || path.length < 2) continue;
        const list = groups.get(path[1]) ?? [];
        list.push(fqn);
        groups.set(path[1], list);
      }
      for (const [name, fqns] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
        set(name, { kind: "decl", fqns, typeOnly: false, derived: true });
      }
    }
    return entries;
  }

  /**
   * Every name a module exports with what it denotes: its own entries, then
   * what `export *` supplies. Own entries win over a star's; two stars that
   * disagree make the name exported by neither (`AMBIGUOUS`). One pass over the
   * star closure, so a barrel of hundreds of stars costs its names, not its
   * names times its stars. `visited` stops cycles.
   */
  resolveAll(id: string, visited = new Set<string>()): Map<string, Resolved> {
    const result = new Map<string, Resolved>();
    const index = this.modules.get(id);
    if (!index || visited.has(id)) return result;
    visited.add(id);
    for (const [name, entry] of this.ownEntries(index)) {
      result.set(name, this.follow(entry, new Set([`${id}\u0000${name}`])));
    }
    const fromStars = new Map<string, Resolved>();
    for (const record of index.records) {
      if (record.kind !== "star") continue;
      const target = this.targetOf(record);
      if (!target) continue;
      for (const [name, binding] of this.resolveAll(target, visited)) {
        if (name === "default" || result.has(name) || !binding) continue;
        const seen = fromStars.get(name);
        if (seen === undefined) fromStars.set(name, binding);
        else if (seen === AMBIGUOUS || binding === AMBIGUOUS || bindingKey(seen) !== bindingKey(binding)) {
          fromStars.set(name, AMBIGUOUS);
        }
      }
    }
    for (const [name, binding] of fromStars) result.set(name, binding);
    return result;
  }

  /** `ResolveExport`: what `name` exported by a module denotes. */
  resolve(id: string, name: string, seen = new Set<string>(), synthetic = false): Resolved {
    const key = `${id}\u0000${name}`;
    if (seen.has(key)) return undefined;
    seen.add(key);
    const index = this.modules.get(id);
    if (!index) return undefined;

    const entry = this.ownEntries(index).get(name);
    if (entry) return this.follow(entry, seen);
    if (name === "default") {
      // `import x from "m"` of an `export =` module reads the assigned value.
      return synthetic ? this.exportEquals(index) : undefined;
    }
    let found: Binding | undefined;
    for (const record of index.records) {
      if (record.kind !== "star") continue;
      const target = this.targetOf(record);
      if (!target) continue;
      const result = this.resolve(target, name, seen);
      if (result === AMBIGUOUS) return AMBIGUOUS;
      if (!result) continue;
      if (found && bindingKey(found) !== bindingKey(result)) return AMBIGUOUS;
      found ??= result;
    }
    return found;
  }

  private follow(entry: OwnEntry, seen: Set<string>): Resolved {
    switch (entry.kind) {
      case "decl":
        return {
          fqns: entry.fqns,
          typeOnly: entry.typeOnly,
          ...(entry.derived ? { derived: true } : {}),
        };
      case "namespace":
        return { fqns: [], namespace: entry.target, typeOnly: entry.typeOnly };
      case "reexport": {
        const result = this.resolve(entry.target, entry.from, seen, true);
        if (!result || result === AMBIGUOUS) return result;
        return { ...result, typeOnly: result.typeOnly || entry.typeOnly };
      }
    }
  }

  /** Resolves one export-list element written in module `index`. */
  resolveElement(
    index: ModuleIndex,
    record: Extract<ExportRecord, { kind: "named" }>,
    element: { name: string; propertyName?: string; isTypeOnly: boolean },
  ): ResolvedExportElement {
    const from = element.propertyName ?? element.name;
    const base = {
      name: element.name,
      from,
      isTypeOnly: record.isTypeOnly || element.isTypeOnly,
    };
    const empty: ResolvedExportElement = { ...base, fqns: [] };
    const fileOf = (target: string | undefined): string | undefined =>
      target && !isAmbientModuleId(target) ? target : undefined;

    let result: Resolved;
    let via: string | undefined;
    if (record.specifier !== undefined) {
      const target = this.targetOf(record);
      if (!target) return empty;
      via = fileOf(target);
      result = this.resolve(target, from, new Set(), true);
    } else {
      const imported = index.imports.get(from);
      if (imported) {
        const target = this.targetOf(imported);
        if (!target) return empty;
        via = fileOf(target);
        result =
          imported.imported === "*"
            ? { fqns: [], namespace: target, typeOnly: imported.isTypeOnly }
            : this.resolve(target, imported.imported, new Set(), true);
        if (result && result !== AMBIGUOUS && imported.isTypeOnly) result = { ...result, typeOnly: true };
      } else {
        const head = index.heads.get(from);
        result = head ? { fqns: [...head.fqns].sort(), typeOnly: false } : undefined;
      }
    }
    if (!result || result === AMBIGUOUS) return empty;
    const namespaceFile = fileOf(result.namespace);
    return {
      ...base,
      isTypeOnly: base.isTypeOnly || result.typeOnly,
      fqns: [...result.fqns],
      ...(via ? { viaFile: via } : {}),
      ...(namespaceFile ? { namespaceFile } : {}),
    };
  }

  /** Resolves an assignment's expression to the declarations it names. */
  resolveAssignment(index: ModuleIndex, expression: string): string[] {
    const entry = this.local(index, expression.split(".")[0]);
    if (!entry) return [];
    const result = this.follow(entry, new Set());
    return result && result !== AMBIGUOUS ? [...result.fqns] : [];
  }

  /** Every route from `entry`, appended to `out`. */
  collectRoutes(
    entry: string,
    out: Map<string, ExportRoute[]>,
    id = entry,
    prefix: readonly string[] = [],
    typeOnly = false,
    active = new Set<string>(),
  ): void {
    const index = this.modules.get(id);
    if (!index || active.has(id)) return;
    active.add(id);
    /** `head` is what the declaration's own first path segment is exported as. */
    const add = (fqn: string, head: readonly string[], onlyTypes: boolean) => {
      const local = this.placements.get(fqn)?.localPath;
      if (!local) return;
      const list = out.get(fqn) ?? [];
      list.push({ entry, path: [...prefix, ...head, ...local.slice(1)], typeOnly: onlyTypes });
      out.set(fqn, list);
    };

    // `export = x`: `x` is the module object itself, so its first segment
    // contributes nothing and a merged namespace's members sit directly on it.
    const equals = this.exportEquals(index);
    if (equals && equals !== AMBIGUOUS) {
      if (equals.namespace) {
        this.collectRoutes(entry, out, equals.namespace, prefix, typeOnly || equals.typeOnly, active);
      }
      for (const fqn of equals.fqns) add(fqn, [], typeOnly || equals.typeOnly);
    }
    const names = this.resolveAll(id);
    for (const name of [...names.keys()].sort()) {
      const binding = names.get(name);
      if (!binding || binding === AMBIGUOUS || binding.derived) continue;
      const onlyTypes = typeOnly || binding.typeOnly;
      if (binding.namespace) {
        this.collectRoutes(entry, out, binding.namespace, [...prefix, name], onlyTypes, active);
        continue;
      }
      for (const fqn of binding.fqns) add(fqn, [name], onlyTypes);
    }
    active.delete(id);
  }
}

/**
 * Resolves raw records over the whole program (HD-17, HD-18): every named
 * record follows barrel chains and import-then-export to its declarations, and
 * every declaration reachable from an input file gets its runtime routes.
 * `inputFiles` are the files the user named; a declaration no input exports
 * has no route.
 */
export function linkModuleExports(
  table: ModuleExportTable,
  symbols: ReadonlyMap<string, readonly ProgramSymbol[]>,
  inputFiles: readonly string[] = [],
): LinkedModuleExports {
  const graph = new ExportGraph(table, symbols);

  const byFile = new Map<string, ResolvedModuleExport[]>();
  const diagnostics: ModuleExportDiagnostic[] = [];
  for (const file of [...table.keys()].sort()) {
    const index = graph.index(file);
    const resolved: ResolvedModuleExport[] = [];
    for (const record of table.get(file) ?? []) {
      // Ambient-module records describe that module, not this file's library.
      if (!isExportRecord(record) || record.module !== undefined || !index) continue;

      if (record.kind === "assignment") {
        const name = record.expression.split(".")[0];
        const targets = graph.resolveAssignment(index, record.expression).sort();
        if (targets.length === 0 && IDENTIFIER.test(name)) {
          diagnostics.push({
            code: "MODULE_EXPORT_UNRESOLVED",
            file,
            line: record.line,
            message: `${record.isDefault ? "export default" : "export ="} ${record.expression} does not name a declaration in this file`,
          });
        }
        resolved.push({ ...record, targets });
        continue;
      }

      if (record.specifier !== undefined && !graph.targetOf(record)) {
        diagnostics.push({
          code: "MODULE_EXPORT_TARGET_MISSING",
          file,
          line: record.line,
          message: `Re-export target '${record.specifier}' was not resolved`,
        });
        resolved.push({ ...record, targets: [] });
        continue;
      }

      if (record.kind === "named") {
        const elements = record.elements.map((element) => graph.resolveElement(index, record, element));
        for (const element of elements) {
          if (element.fqns.length > 0 || element.namespaceFile) continue;
          const written = element.from === element.name ? element.name : `${element.from} as ${element.name}`;
          diagnostics.push({
            code: "MODULE_EXPORT_UNRESOLVED",
            file,
            line: record.line,
            message:
              record.specifier !== undefined
                ? `export { ${written} } from '${record.specifier}' does not resolve to a declaration`
                : `export { ${written} } does not name a declaration or import in this file`,
          });
        }
        resolved.push({
          ...record,
          targets: [...new Set(elements.flatMap((element) => element.fqns))].sort(),
          resolvedElements: elements,
        });
      } else {
        // Star and namespace re-exports bind a whole file, which may itself
        // be a barrel with no declarations of its own.
        resolved.push({ ...record, targets: record.targetFile ? [record.targetFile] : [] });
      }
    }
    if (resolved.length > 0) byFile.set(file, resolved);
  }

  return { byFile, diagnostics, routes: computeRoutes(graph, inputFiles) };
}

function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function computeRoutes(
  graph: ExportGraph,
  inputFiles: readonly string[],
): ReadonlyMap<string, readonly ExportRoute[]> {
  const inputs = new Set(inputFiles);
  const entries = graph.moduleIds().filter((id) => {
    if (!isAmbientModuleId(id)) return inputs.has(id);
    return [...graph.filesOf(id)].some((file) => inputs.has(file));
  });
  const collected = new Map<string, ExportRoute[]>();
  for (const entry of entries) graph.collectRoutes(entry, collected);

  const routes = new Map<string, readonly ExportRoute[]>();
  for (const fqn of [...collected.keys()].sort()) {
    const seen = new Set<string>();
    const unique = collected
      .get(fqn)!
      .filter((route) => {
        const key = `${route.entry}\u0000${route.path.join("\u0001")}\u0000${route.typeOnly}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      // The order the backend takes the first route in: the most direct path,
      // then the entry, then the path itself. Plain code-unit comparison, so
      // the choice does not depend on a locale.
      .sort(
        (a, b) =>
          a.path.length - b.path.length ||
          compareCodeUnits(a.entry, b.entry) ||
          compareCodeUnits(a.path.join("."), b.path.join(".")) ||
          Number(a.typeOnly) - Number(b.typeOnly),
      );
    routes.set(fqn, unique);
  }
  return routes;
}

/**
 * Public names for declarations exported only under an alias (HD-18):
 * `declare function hidden(): void; export { hidden as publicName }` is emitted
 * as `publicName`, so the alias needs no typedef. Per-file facts only (a
 * declaration, its modifiers and its own file's export list), so a watch
 * session computes it file by file with the same result as a cold run.
 */
export function aliasOnlyNames(
  table: ModuleExportTable,
  symbols: ReadonlyMap<string, readonly ProgramSymbol[]>,
): Map<string, string> {
  const result = new Map<string, string>();
  for (const [file, records] of table) {
    const exportRecords = records.filter(
      (record): record is ExportRecord => isExportRecord(record) && record.module === undefined,
    );
    if (exportRecords.length === 0) continue;
    const imported = new Set(
      records.flatMap((record) =>
        record.kind === "import" && record.module === undefined
          ? record.bindings.map((binding) => binding.local)
          : [],
      ),
    );
    // Names each local binding is exported under, in source order.
    const publicNames = new Map<string, string[]>();
    const ownName = new Set<string>();
    for (const record of exportRecords) {
      if (record.kind === "assignment") {
        if (IDENTIFIER.test(record.expression)) ownName.add(record.expression);
        continue;
      }
      if (record.kind !== "named" || record.specifier !== undefined) continue;
      for (const element of record.elements) {
        const local = element.propertyName ?? element.name;
        if (
          element.propertyName === undefined ||
          element.propertyName === element.name ||
          element.name === "default"
        ) {
          ownName.add(local);
        } else if (IDENTIFIER.test(element.name)) {
          publicNames.set(local, [...(publicNames.get(local) ?? []), element.name]);
        }
      }
    }
    for (const [local, names] of publicNames) {
      if (ownName.has(local) || imported.has(local)) continue;
      const fqn = `${file}::${local}`;
      const group = symbols.get(fqn);
      const facet = group?.[0]?.facets[0];
      if (!group || !facet || !facet.origin.fileIsModule || facet.origin.scopes.length > 0) continue;
      const kinds = group.flatMap((symbol) => symbol.facets.map((each) => each.ir.modifiers.exportKind));
      if (kinds.some((kind) => kind !== "none")) continue;
      result.set(fqn, names[0]);
    }
  }
  return result;
}
