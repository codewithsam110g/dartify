import {
  namespaceOfSymbolType,
  Symbol,
  SymbolFacet,
  SymbolType,
} from "@/symbol";
import { IRDeclKind } from "@ir/declaration";
import { IRTypeAlias } from "@ir/typealias";
import { IRType, TypeKind } from "@ir/type";
import { AliasRegistry, MintedAlias } from "./registry";
import { forEachIRType } from "@ir/visit";

/**
 * Turns every unrepresentable type in the symbol table into a real declared
 * symbol (`L-05`, `E-16`, design principle 2).
 *
 * Runs during linking rather than parsing because uniqueness is a whole-file
 * property: a name has to be checked against every other declaration in the
 * file, and no single `parseType` call can see those. Design principle 4 —
 * the linker owns cross-declaration semantics.
 *
 * Two things happen per file, in order:
 *
 * 1. Every `Unsupported` node gets `aliasName` pointing at its typedef. The
 *    node stays `Unsupported`; it is not rewritten into a `TypeReference`, so
 *    `unsupportedReason` remains queryable and "how much are we still
 *    degrading?" stays answerable after linking.
 * 2. One `TYPE_ALIAS` symbol is registered per distinct expression, so the
 *    typedef is a first-class member of the table — visible to the linker, to
 *    `tools/graph.ts`, and to the emitter with no special case.
 */
export interface AliasRegistration {
  /** Minted aliases keyed by source file, in first-seen order. */
  byFile: Map<string, MintedAlias[]>;
  /** Distinct typedefs across all files. */
  total: number;
  /** Use sites that now resolve to a name instead of a bare `dynamic`. */
  useSites: number;
}

function sourceFileOf(fqn: string): string {
  const separator = fqn.indexOf("::");
  return separator === -1 ? fqn : fqn.substring(0, separator);
}

/**
 * The Dart-visible name of a symbol — the last scope segment. Dart output is
 * flat, so `Ns|Widget` and a top-level `Widget` would collide in the emitted
 * file even though their FQNs differ.
 */
function declaredNameOf(fqn: string): string {
  const separator = fqn.indexOf("::");
  if (separator === -1) return fqn;
  const segments = fqn.substring(separator + 2).split("|");
  return segments[segments.length - 1] ?? "";
}

/**
 * Visits every node in an IR declaration looking for degraded types.
 *
 * Structural rather than a per-declaration-kind switch, on purpose: a typed
 * walker has to enumerate every member list, parameter list and nested literal,
 * and the failure mode of forgetting one is silent — a use site that keeps its
 * bare `dynamic` with nothing to show it was missed. `Unsupported` is a unique
 * `kind` value, so matching on it needs no type discrimination. The IR is
 * structured-cloneable (`deepCloneIRDeclaration`), so it is acyclic and this
 * terminates.
 */
export function registerAliasSymbols(
  table: Map<string, Symbol[]>,
): AliasRegistration {
  const symbolsByFile = new Map<string, Symbol[]>();
  const namesByFile = new Map<string, Set<string>>();

  for (const [fqn, symbols] of table) {
    const file = sourceFileOf(fqn);

    let group = symbolsByFile.get(file);
    if (!group) symbolsByFile.set(file, (group = []));
    group.push(...symbols);

    let names = namesByFile.get(file);
    if (!names) namesByFile.set(file, (names = new Set()));
    const declared = declaredNameOf(fqn);
    if (declared) names.add(declared);
  }

  const byFile = new Map<string, MintedAlias[]>();
  let total = 0;
  let useSites = 0;

  for (const [file, symbols] of symbolsByFile) {
    const declared = namesByFile.get(file) ?? new Set<string>();
    const registry = new AliasRegistry((name) => declared.has(name));

    for (const symbol of symbols) {
      for (const facet of symbol.facets) {
        // `type Mapped = { [K in keyof T]: T[K] }` already *is* a named
        // degradation. Minting a second name would add an empty alias hop.
        const authorNamed =
          facet.ir.kind === IRDeclKind.TypeAlias
            ? (facet.ir as IRTypeAlias).type
            : undefined;

        forEachIRType(facet.ir, (type) => {
          if (type.kind !== TypeKind.Unsupported) return;
          if (type === authorNamed) return;

          const alias = registry.mint(
            type.originalText ?? "",
            type.unsupportedReason!,
          );
          type.aliasName = alias.name;
          useSites++;
        });
      }
    }

    const minted = registry.all();
    if (minted.length === 0) continue;

    byFile.set(file, minted);
    total += minted.length;

    for (const alias of minted) {
      // A fresh node, not a copy of a use site: copying one would carry its
      // `aliasName` across and emit `typedef Foo = Foo;`.
      const declaration: IRTypeAlias = {
        kind: IRDeclKind.TypeAlias,
        modifiers: {
          exportKind: "none",
          isDeclare: false,
          isAmbient: false,
        },
        name: alias.name,
        typeParams: [],
        type: {
          kind: TypeKind.Unsupported,
          name: TypeKind.Unsupported,
          isNullable: false,
          originalText: alias.originalText,
          unsupportedReason: alias.reason,
        },
      };

      const fqn = `${file}::${alias.name}`;
      const facet: SymbolFacet = {
        type: SymbolType.TYPE_ALIAS,
        namespace: namespaceOfSymbolType(SymbolType.TYPE_ALIAS),
        ir: declaration,
        origin: {
          filePath: file,
          scopes: [],
          sourceOrder: Number.MAX_SAFE_INTEGER,
        },
        emit: true,
        provenance: [],
      };
      const symbol: Symbol = {
        fqn,
        facets: [facet],
        // `dynamic` depends on nothing. Registering it with an empty dep list
        // keeps it `LinkedIndependent` rather than absent from the graph.
        deps: [],
        resolvedDeps: [],
        minted: true,
      };

      const existing = table.get(fqn);
      if (existing) table.set(fqn, [...existing, symbol]);
      else table.set(fqn, [symbol]);
    }
  }

  return { byFile, total, useSites };
}
