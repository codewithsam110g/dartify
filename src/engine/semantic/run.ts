import { registerAliasSymbols } from "@engine/alias/register";
import { IRDeclKind } from "@ir/declaration";
import { forEachIRType } from "@ir/visit";
import { Symbol, SymbolFacet } from "@/symbol";
import { dependenciesOfFacets } from "@/symbol/dependencies";
import { sourceFileOfFQN, terminalNameOfFQN } from "@/symbol/fqn";
import { SymbolTable, SymbolTableChange } from "@/symbol/table";
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
  const input = symbolTable.getSymbolTable();
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
  commitDraft(symbolTable, input, draft);

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
    const clones = group.map((symbol) => structuredClone(symbol));
    const facets = clones
      .flatMap((symbol) => symbol.facets)
      .sort(
        (a, b) => a.origin.sourceOrder - b.origin.sourceOrder,
      );
    result.set(fqn, [
      {
        fqn,
        facets,
        deps: dependenciesOfFacets(facets),
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
        terminalNameOfFQN(fqn).startsWith("Anon_")
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

function rewriteRedirects(
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

function commitDraft(
  symbolTable: SymbolTable,
  input: ReadonlyMap<string, readonly Symbol[]>,
  draft: ReadonlyMap<string, readonly Symbol[]>,
): void {
  const changes: SymbolTableChange[] = [];
  for (const fqn of input.keys()) {
    if (!draft.has(fqn)) changes.push({ kind: "unregister", fqn });
  }
  for (const [fqn, symbols] of draft) {
    changes.push({ kind: "replace", fqn, symbols });
  }
  symbolTable.apply(changes);
}
