import { Symbol, SymbolFacet } from "@/symbol";
import { sourceFileOfFQN } from "@/symbol/fqn";
import { ambientModuleId, localPathOf } from "@/symbol/exports";
import { IRDeclKind } from "@ir/declaration";
import { IRTypeParam } from "@ir/signature";
import { legalDartName } from "@engine/semantic/keywords";
import { BackendDiagnostic, LibraryInput } from "../backend";
import { emitFunction, emitVariable, jsPath } from "./declarations";
import { siblingUri } from "./library";
import { ProgramIndex } from "./program";
import { EmitContext, emitTypeParams, withTypeParams } from "./types";

/** A Dart `export` directive; `show` is absent for an unfiltered `export *`. */
export interface ReExport {
  uri: string;
  targetFile: string;
  show?: string[];
}

export interface PublicNamePlan {
  /** `export '<library>' [show …]` directives for names and files re-exported. */
  directives: ReExport[];
  /** Typedefs and second bindings that give a declaration an additional public name. */
  aliasLines: string[];
  /** `export * as ns` pointers: Dart has no namespace re-export (HD-19). */
  comments: string[];
  diagnostics: BackendDiagnostic[];
}

/** Dart has no `default` identifier; Dart cannot rename on export (HD-18). */
function valuePrefix(name: string): string {
  return name.startsWith("JS$") ? name : `JS$${name}`;
}

/**
 * What a library must say so its Dart API carries the TypeScript public names
 * of its module (HD-18, HD-19).
 *
 * A name exported as itself is plain `export … show`; a name the module
 * renames cannot be expressed on a Dart `export`, so the library declares it:
 * a `typedef` for a class, interface, enum or type alias (Dart 3 reaches
 * constructors and static members through it), a second `external` binding for
 * a function or variable. Both aim at the declaration itself, wherever it
 * lives, so barrel chains need no intermediate step. `export * as ns` becomes a
 * comment naming the `import … as ns` that gives the same spelling in Dart.
 */
export function planPublicNames(
  input: LibraryInput,
  index: ProgramIndex,
  context: EmitContext,
): PublicNamePlan {
  const directives = new Map<string, ReExport>();
  const aliasLines: string[] = [];
  const comments: string[] = [];
  const diagnostics: BackendDiagnostic[] = [];
  const declaredAliases = new Set<string>();

  const diagnose = (code: string, name: string, message: string) =>
    diagnostics.push({ code, file: input.sourceFile, name, message });

  const exportFrom = (targetFile: string, names: readonly string[] | undefined) => {
    if (targetFile === input.sourceFile) return;
    const target = input.outputPathOfFile.get(targetFile);
    if (!target) return;
    const uri = siblingUri(input.outputPath, target);
    const existing = directives.get(uri);
    if (!names) {
      directives.set(uri, { uri, targetFile });
      return;
    }
    // An unfiltered `export *` of the same library already covers the names.
    if (existing && !existing.show) return;
    const show = new Set([...(existing?.show ?? []), ...names]);
    if (show.size > 0) directives.set(uri, { uri, targetFile, show: [...show].sort() });
  };

  const namespaceComment = (written: string, alias: string, targetFile: string) => {
    const target = input.outputPathOfFile.get(targetFile);
    if (!target) return;
    const uri = siblingUri(input.outputPath, target);
    comments.push(`// ${written}: import '${uri}' as ${alias};`);
    diagnose(
      "NAMESPACE_REEXPORT_NOT_FORWARDED",
      alias,
      `${written} cannot be re-exported by Dart; consumers write import '${uri}' as ${alias}; for the same names`,
    );
  };

  for (const record of input.moduleExports) {
    if (record.kind === "star") {
      if (record.targetFile) exportFrom(record.targetFile, undefined);
      continue;
    }
    if (record.kind === "namespace") {
      if (record.targetFile) {
        namespaceComment(
          `export * as ${record.alias} from '${record.specifier}'`,
          record.alias,
          record.targetFile,
        );
      }
      continue;
    }
    if (record.kind !== "named") continue;

    for (const element of record.resolvedElements ?? []) {
      if (element.namespaceFile) {
        namespaceComment(`export { ${element.name} }`, element.name, element.namespaceFile);
        continue;
      }
      let namespaceRename = false;
      for (const fqn of element.fqns) {
        const symbol = index.symbols.get(fqn)?.[0];
        if (!symbol) continue;
        const facets = symbol.facets.filter((facet) => facet.emit);
        if (facets.length === 0) continue;
        const declaredIn = sourceFileOfFQN(fqn);
        const path = localPathOf(facets[0]);

        // A namespace has no Dart declaration to rename: its members are
        // top-level names already, and they keep them.
        if (path && path.length > 1) {
          if (element.name !== path[0] && element.name !== "default") namespaceRename = true;
          exportFrom(
            declaredIn,
            facets.map((facet) => facet.ir.dartName ?? facet.ir.name),
          );
          continue;
        }

        const dual =
          symbol.facets.some((facet) => facet.namespace === "type") &&
          symbol.facets.some((facet) => facet.namespace === "value");
        const overloaded = facets.filter((facet) => facet.ir.kind === IRDeclKind.Function).length > 1;
        for (const facet of facets) {
          const own = facet.ir.dartName ?? facet.ir.name;
          // The same spelling the semantic pass gives a declaration of that name.
          const base = legalDartName(element.name, facet.namespace === "value" ? "value" : "type");
          let expected = dual && facet.namespace === "value" ? valuePrefix(base) : base;
          if (overloaded && facet.ir.kind === IRDeclKind.Function) {
            expected += own.match(/_\d+$/)?.[0] ?? "";
          }
          // A bare `default` keeps the declaration's own name.
          if (element.name === "default" || own === expected) {
            exportFrom(declaredIn, [own]);
            continue;
          }
          const lines = aliasFor(input, index, context, {
            fqn,
            symbol,
            facet,
            declaredIn,
            // The module whose export list names it: the file's, or an ambient module's.
            entry: record.module !== undefined ? ambientModuleId(record.module) : input.sourceFile,
            written: describeElement(element.from, element.name, record.specifier),
            publicName: element.name,
            aliasName: expected,
          });
          if (!lines) continue;
          if (declaredAliases.has(expected) || context.plan.isDeclared(expected)) {
            diagnose(
              "PUBLIC_NAME_UNAVAILABLE",
              element.name,
              `public name ${element.name} cannot be declared: ${expected} is already a top-level name of this library`,
            );
            continue;
          }
          declaredAliases.add(expected);
          aliasLines.push(...lines, "");
        }
      }
      if (namespaceRename) {
        diagnose(
          "PUBLIC_NAME_UNAVAILABLE",
          element.name,
          `namespace ${element.from} exported as ${element.name} cannot be renamed in Dart; its members keep their own names`,
        );
      }
    }
  }

  return {
    directives: [...directives.values()].sort((a, b) => a.uri.localeCompare(b.uri)),
    aliasLines,
    comments,
    diagnostics,
  };
}

function describeElement(from: string, name: string, specifier: string | undefined): string {
  const written = from === name ? name : `${from} as ${name}`;
  return `export { ${written} }${specifier === undefined ? "" : ` from '${specifier}'`}`;
}

interface AliasTarget {
  fqn: string;
  symbol: Symbol;
  facet: SymbolFacet;
  declaredIn: string;
  /** The export graph module whose export list gives the public name. */
  entry: string;
  /** The export statement, for the doc comment. */
  written: string;
  /** The TypeScript public name. */
  publicName: string;
  /** The Dart name that carries it. */
  aliasName: string;
}

/** The declaration of one additional public name, or undefined if Dart has none to give. */
function aliasFor(
  input: LibraryInput,
  index: ProgramIndex,
  context: EmitContext,
  target: AliasTarget,
): string[] | undefined {
  const { facet, fqn, aliasName } = target;
  const doc = `/// Public name \`${target.publicName}\` of \`${facet.ir.name}\` (\`${target.written}\`).`;
  const kind = facet.ir.kind;

  if (kind === IRDeclKind.Function || kind === IRDeclKind.Variable) {
    const renamed = { ...facet, ir: { ...facet.ir, dartName: aliasName } } as SymbolFacet;
    const own = context.routes?.routedAs(fqn, target.entry, target.publicName);
    const scoped: EmitContext = {
      ...context,
      currentFQN: fqn,
      pathOverride: own ?? jsPath(facet, { ...context, currentFQN: fqn }),
    };
    const emitted = kind === IRDeclKind.Function ? emitFunction(renamed, scoped) : emitVariable(renamed, scoped);
    return [doc, ...emitted.lines.filter((line) => !line.startsWith("///"))];
  }

  // Types: class, interface, enum, type alias. Another name for the Dart type.
  const typeFacet = index.typeFacet(fqn);
  if (!typeFacet || typeFacet !== facet) return undefined;
  const typeParams = (facet.ir as { typeParams?: readonly IRTypeParam[] }).typeParams ?? [];
  const own = facet.ir.dartName ?? facet.ir.name;
  const source =
    target.declaredIn === input.sourceFile
      ? own
      : context.plan.siblingName(input.outputPathOfFile.get(target.declaredIn)!, own);
  const inner = withTypeParams(context, typeParams);
  const parameters = emitTypeParams(typeParams, inner);
  const args =
    typeParams.length > 0 ? `<${typeParams.map((parameter) => parameter.dartName ?? parameter.name).join(", ")}>` : "";
  return [doc, `typedef ${aliasName}${parameters} = ${source}${args};`];
}
