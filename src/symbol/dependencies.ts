import { IRDeclaration } from "@ir/declaration";
import { IRReferenceTarget } from "@ir/type";
import { forEachIRType } from "@ir/visit";
import { SymbolFacet } from "./index";

export function dependenciesOf(
  declaration: IRDeclaration,
): IRReferenceTarget[] {
  const dependencies: IRReferenceTarget[] = [];
  forEachIRType(declaration, (type) => {
    if (type.reference) dependencies.push(type.reference);
  });
  return dependencies;
}

export function dependenciesOfFacets(
  facets: readonly SymbolFacet[],
): IRReferenceTarget[] {
  return facets.flatMap((facet) => dependenciesOf(facet.ir));
}
