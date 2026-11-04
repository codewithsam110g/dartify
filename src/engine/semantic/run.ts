import { registerAliasSymbols } from "@engine/alias/register";
import { IRDeclKind } from "@ir/declaration";
import { forEachIRType } from "@ir/visit";
import { Symbol, SymbolFacet } from "@/symbol";
import { dependenciesOfFacets } from "@/symbol/dependencies";
import { sourceFileOfFQN } from "@/symbol/fqn";
import { SymbolTable, SymbolTableDraft } from "@/symbol/table";
import { anonymousShapeKey } from "./shape";
import { mergeDeclarationGroups } from "./merge";
import { assignSemanticNames } from "./names";
import {
  emptySemanticReport,
  SemanticRedirect,
  SemanticReport,
} from "./types";

export interface SemanticPassResult {
  report: SemanticReport;
  aliasesMinted: number;
  aliasUseSites: number;
}

/** Runs every pre-link semantic rewrite against a detached table draft. */
export function runSemanticPass(symbolTable: SymbolTable): SemanticPassResult {
  return symbolTable.transaction((table) => {
    const result = runSemanticPassOnDraft(table);
    return result;
  });
}

/**
 * The semantic rewrite proper. `table` is a transaction draft owned by the
 * caller's `SymbolTable`; it is replaced wholesale with the semantic output and
 * committed only if this function returns.
 */
export function runSemanticPassOnDraft(table: SymbolTableDraft): SemanticPassResult {
  const input: ReadonlyMap<string, readonly Symbol[]> = new Map(table);
  const report = emptySemanticReport();
  report.inputSymbols = [...input.values()].reduce(
    (count, group) => count + group.length,
    0,
  );
  report.inputDeclarations = [...input.values()].reduce(
    (count, group) =>
      count +
      group.reduce((facetCount, symbol) => facetCount + symbol.facets.length, 0),
    0,
  );
  report.globalDeclarationsHoisted = [...input.values()].reduce(
    (count, group) =>
      count +
      group.reduce(
        (symbolCount, symbol) =>
          symbolCount +
          symbol.facets.filter((facet) =>
            facet.origin.scopes.some((scope) => scope.kind === "global"),
          ).length,
        0,
      ),
    0,
  );

  const draft = cloneAndConsolidate(input);
  suppressExternalAugmentations(draft, report);
  const redirects = canonicalizeAnonymousSymbols(draft, report);
  mergeDeclarationGroups(draft, report, redirects);
  rewriteRedirects(draft, redirects);

  const aliases = registerAliasSymbols(draft);
  assignSemanticNames(draft, report);
  refreshDependencies(draft);
  table.clear();
  for (const [fqn, group] of draft) table.set(fqn, group);

  report.outputSymbols = draft.size;
  report.outputFacets = [...draft.values()].reduce(
    (count, group) =>
      count +
      group.reduce((facetCount, symbol) => facetCount + symbol.facets.length, 0),
    0,
  );
  report.redirects.sort((a, b) => a.fromFQN.localeCompare(b.fromFQN));
  report.suppressedAugmentations.sort((a, b) =>
    a.ownerFQN.localeCompare(b.ownerFQN),
  );
  report.diagnostics.sort((a, b) =>
    `${a.ownerFQN}\u0000${a.code}`.localeCompare(
      `${b.ownerFQN}\u0000${b.code}`,
    ),
  );

  return {
    report,
    aliasesMinted: aliases.total,
    aliasUseSites: aliases.useSites,
  };
}

function cloneAndConsolidate(
  input: ReadonlyMap<string, readonly Symbol[]>,
): Map<string, Symbol[]> {
  const result = new Map<string, Symbol[]>();
  for (const [fqn, group] of input) {
    // The transaction draft is already deeply detached from the table.
    const clones = [...group];
    const facets = clones
      .flatMap((symbol) => symbol.facets)
      .sort(
        (a, b) => a.origin.sourceOrder - b.origin.sourceOrder,
      );
    result.set(fqn, [
      {
        fqn,
        facets,
        deps: [],
        resolvedDeps: [],
        ...(clones.every((symbol) => symbol.minted) ? { minted: true } : {}),
      },
    ]);
  }
  return result;
}

function suppressExternalAugmentations(
  draft: Map<string, Symbol[]>,
  report: SemanticReport,
): void {
  for (const [fqn, group] of [...draft]) {
    const symbol = group[0];
    const suppressed = symbol.facets.filter((facet) =>
      facet.origin.scopes.some(
        (scope) =>
          scope.kind === "externalModule" && scope.isAugmentation,
      ),
    );
    if (suppressed.length === 0) continue;

    const retained = symbol.facets.filter(
      (facet) => !suppressed.includes(facet),
    );
    const moduleScope = suppressed
      .flatMap((facet) => facet.origin.scopes)
      .find(
        (scope) =>
          scope.kind === "externalModule" && scope.isAugmentation,
      );
    if (!moduleScope || moduleScope.kind !== "externalModule") continue;

    report.externalAugmentationsSuppressed += suppressed.length;
    report.suppressedAugmentations.push({
      ownerFQN: fqn,
      moduleSpecifier: moduleScope.specifier,
      canonicalTarget: moduleScope.canonicalTarget,
      declarationKinds: suppressed.map((facet) => facet.ir.kind).sort(),
    });
    report.diagnostics.push({
      code: "EXTERNAL_MODULE_AUGMENTATION_SUPPRESSED",
      ownerFQN: fqn,
      action: "suppressed",
      message: `External module augmentation '${moduleScope.specifier}' is modeled but not emitted in Stage 4`,
    });

    if (retained.length === 0) draft.delete(fqn);
    else {
      symbol.facets = retained;
      symbol.deps = dependenciesOfFacets(retained);
    }
  }
}

function canonicalizeAnonymousSymbols(
  draft: Map<string, Symbol[]>,
  report: SemanticReport,
): Map<string, string> {
  const canonicalByFileAndShape = new Map<string, string>();
  const redirects = new Map<string, string>();

  const candidates = [...draft.entries()]
    .filter(([fqn, group]) => {
      const facet = group[0].facets[0];
      return (
        group[0].facets.length === 1 &&
        facet.ir.kind === IRDeclKind.Interface &&
        facet.synthetic === "anonymousType"
      );
    })
    .sort(([, a], [, b]) =>
      a[0].facets[0].origin.sourceOrder -
      b[0].facets[0].origin.sourceOrder,
    );

  for (const [fqn, group] of candidates) {
    const facet = group[0].facets[0];
    const shape = anonymousShapeKey(facet.ir);
    const key = `${sourceFileOfFQN(fqn)}\u0000${shape}`;
    const canonical = canonicalByFileAndShape.get(key);
    if (!canonical) {
      canonicalByFileAndShape.set(key, fqn);
      continue;
    }

    redirects.set(fqn, canonical);
    draft.delete(fqn);
    report.anonymousSymbolsCanonicalized++;
    report.redirects.push({
      fromFQN: fqn,
      toFQN: canonical,
      reason: "anonymousCanonicalization",
    });
  }

  return redirects;
}

export function rewriteRedirects(
  draft: Map<string, Symbol[]>,
  redirects: ReadonlyMap<string, string>,
): void {
  if (redirects.size === 0) return;
  const resolveRedirect = (fqn: string): string => {
    const seen = new Set<string>();
    let current = fqn;
    while (redirects.has(current)) {
      if (seen.has(current)) {
        throw new Error(`Semantic redirect cycle detected at '${current}'`);
      }
      seen.add(current);
      current = redirects.get(current)!;
    }
    return current;
  };

  for (const group of draft.values()) {
    for (const symbol of group) {
      for (const facet of symbol.facets) {
        forEachIRType(facet.ir, (type) => {
          const reference = type.reference;
          if (!reference) return;
          if (reference.lookup.kind === "checker") {
            reference.lookup.candidates = [
              ...new Set(
                reference.lookup.candidates.map(resolveRedirect),
              ),
            ].sort();
          } else {
            reference.lookup.pseudoFQN = resolveRedirect(
              reference.lookup.pseudoFQN,
            );
          }
          if (reference.resolvedFQN) {
            reference.resolvedFQN = resolveRedirect(reference.resolvedFQN);
          }
        });
      }
    }
  }
}

function refreshDependencies(draft: Map<string, Symbol[]>): void {
  for (const group of draft.values()) {
    for (const symbol of group) {
      symbol.deps = dependenciesOfFacets(symbol.facets);
      symbol.resolvedDeps = [];
      for (const facet of symbol.facets) {
        forEachIRType(facet.ir, (type) => {
          if (!type.reference) return;
          delete type.reference.resolvedFQN;
          delete type.reference.resolvedDartName;
        });
      }
    }
  }
}

/**
 * Combines independent per-file semantic results. Every semantic rewrite is
 * keyed by an FQN that includes its file, so running the pass file by file
 * (watch mode) and merging is equivalent to one whole-program pass.
 */
export function mergeSemanticResults(
  results: readonly SemanticPassResult[],
): SemanticPassResult {
  const report = emptySemanticReport();
  const counts = [
    "inputSymbols",
    "inputDeclarations",
    "outputSymbols",
    "outputFacets",
    "anonymousSymbolsCanonicalized",
    "declarationGroupsMerged",
    "overloadGroupsRenamed",
    "overloadsRenamed",
    "keywordRenames",
    "namespaceRenames",
    "dualFacetRenames",
    "globalDeclarationsHoisted",
    "externalAugmentationsSuppressed",
  ] as const;
  let aliasesMinted = 0;
  let aliasUseSites = 0;
  for (const result of results) {
    for (const key of counts) report[key] += result.report[key];
    report.redirects.push(...result.report.redirects);
    report.suppressedAugmentations.push(...result.report.suppressedAugmentations);
    report.diagnostics.push(...result.report.diagnostics);
    aliasesMinted += result.aliasesMinted;
    aliasUseSites += result.aliasUseSites;
  }
  report.redirects.sort((a, b) => a.fromFQN.localeCompare(b.fromFQN));
  report.suppressedAugmentations.sort((a, b) => a.ownerFQN.localeCompare(b.ownerFQN));
  report.diagnostics.sort((a, b) =>
    `${a.ownerFQN}\u0000${a.code}`.localeCompare(`${b.ownerFQN}\u0000${b.code}`),
  );
  return { report, aliasesMinted, aliasUseSites };
}
