/**
 * Module export identity (`P-17`, task 4.12).
 *
 * Declarations carry their own `export`/`export default` modifiers. Everything
 * else a module can export — `export =`, `export default identifier`, export
 * lists, and star/namespace re-exports — is recorded here per file, then
 * resolved by the linker into `LinkedProgram.moduleExports`.
 */

export type ModuleExportRecord =
  | {
      /** `export = X` (`isDefault: false`) or `export default X` (`true`). */
      kind: "assignment";
      isDefault: boolean;
      /** The expression as written, e.g. `L` or `h3`. */
      expression: string;
      line: number;
    }
  | {
      /** `export { a, b as c }` with or without `from "m"`. */
      kind: "named";
      elements: { name: string; propertyName?: string; isTypeOnly: boolean }[];
      specifier?: string;
      targetFile?: string;
      isTypeOnly: boolean;
      line: number;
    }
  | {
      /** `export * from "m"`. */
      kind: "star";
      specifier: string;
      targetFile?: string;
      isTypeOnly: boolean;
      line: number;
    }
  | {
      /** `export * as ns from "m"`. */
      kind: "namespace";
      alias: string;
      specifier: string;
      targetFile?: string;
      isTypeOnly: boolean;
      line: number;
    };

/** Run-owned raw records keyed by declaring file. */
export type ModuleExportTable = Map<string, ModuleExportRecord[]>;

export type ResolvedModuleExport = ModuleExportRecord & {
  /** Every FQN the record binds, in the declaring or target file. */
  targets: string[];
};

export interface ModuleExportDiagnostic {
  code: "MODULE_EXPORT_UNRESOLVED" | "MODULE_EXPORT_TARGET_MISSING";
  file: string;
  line: number;
  message: string;
}

export interface LinkedModuleExports {
  readonly byFile: ReadonlyMap<string, readonly ResolvedModuleExport[]>;
  readonly diagnostics: readonly ModuleExportDiagnostic[];
}

/**
 * Resolves raw records against the linked symbol keys. A local name resolves
 * to every FQN in its file whose terminal segment is that name at file scope;
 * a re-export resolves to its target file, which must have been loaded.
 */
export function linkModuleExports(
  table: ModuleExportTable,
  symbolFQNs: Iterable<string>,
): LinkedModuleExports {
  const topLevel = new Map<string, Set<string>>();
  const filesWithSymbols = new Set<string>();
  for (const fqn of symbolFQNs) {
    const separator = fqn.indexOf("::");
    if (separator < 0) continue;
    const file = fqn.slice(0, separator);
    filesWithSymbols.add(file);
    const logical = fqn.slice(separator + 2);
    const head = logical.split("|")[0];
    const key = `${file}\u0000${head}`;
    let set = topLevel.get(key);
    if (!set) topLevel.set(key, (set = new Set()));
    set.add(fqn);
  }

  const byFile = new Map<string, ResolvedModuleExport[]>();
  const diagnostics: ModuleExportDiagnostic[] = [];
  for (const file of [...table.keys()].sort()) {
    const resolved: ResolvedModuleExport[] = [];
    for (const record of table.get(file) ?? []) {
      if (record.kind === "assignment") {
        const name = record.expression.split(".")[0];
        const targets = [...(topLevel.get(`${file}\u0000${name}`) ?? [])].sort();
        if (targets.length === 0 && /^[A-Za-z_$][\w$]*$/.test(name)) {
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

      if (record.specifier !== undefined && !record.targetFile) {
        diagnostics.push({
          code: "MODULE_EXPORT_TARGET_MISSING",
          file,
          line: record.line,
          message: `Re-export target '${record.specifier}' was not resolved`,
        });
        resolved.push({ ...record, targets: [] });
        continue;
      }

      const sourceFile = record.targetFile ?? file;
      if (record.kind === "named") {
        const targets = record.elements
          .flatMap((element) => [
            ...(topLevel.get(
              `${sourceFile}\u0000${element.propertyName ?? element.name}`,
            ) ?? []),
          ])
          .sort();
        resolved.push({ ...record, targets });
      } else {
        // Star and namespace re-exports bind a whole file, which may itself
        // be a barrel with no declarations of its own.
        resolved.push({ ...record, targets: [sourceFile] });
      }
    }
    if (resolved.length > 0) byFile.set(file, resolved);
  }

  return { byFile, diagnostics };
}
