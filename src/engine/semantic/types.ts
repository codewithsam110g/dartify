export type SemanticDiagnosticCode =
  | "EXTERNAL_MODULE_AUGMENTATION_SUPPRESSED"
  | "DECLARATION_MERGE_CONFLICT"
  | "AMBIGUOUS_CONSTRUCTOR_COMPANION"
  | "UNSUPPORTED_DECLARATION_GROUP";

export interface SemanticDiagnostic {
  code: SemanticDiagnosticCode;
  ownerFQN: string;
  message: string;
  action: "suppressed" | "preservedUnmerged";
}

export interface SemanticRedirect {
  fromFQN: string;
  toFQN: string;
  reason: "anonymousCanonicalization" | "constructorCompanion";
}

export interface SuppressedAugmentation {
  ownerFQN: string;
  moduleSpecifier: string;
  canonicalTarget: string;
  declarationKinds: string[];
}

export interface SemanticReport {
  inputSymbols: number;
  inputDeclarations: number;
  outputSymbols: number;
  outputFacets: number;
  anonymousSymbolsCanonicalized: number;
  declarationGroupsMerged: number;
  overloadGroupsRenamed: number;
  overloadsRenamed: number;
  keywordRenames: number;
  namespaceRenames: number;
  dualFacetRenames: number;
  globalDeclarationsHoisted: number;
  externalAugmentationsSuppressed: number;
  redirects: SemanticRedirect[];
  suppressedAugmentations: SuppressedAugmentation[];
  diagnostics: SemanticDiagnostic[];
}

export function emptySemanticReport(): SemanticReport {
  return {
    inputSymbols: 0,
    inputDeclarations: 0,
    outputSymbols: 0,
    outputFacets: 0,
    anonymousSymbolsCanonicalized: 0,
    declarationGroupsMerged: 0,
    overloadGroupsRenamed: 0,
    overloadsRenamed: 0,
    keywordRenames: 0,
    namespaceRenames: 0,
    dualFacetRenames: 0,
    globalDeclarationsHoisted: 0,
    externalAugmentationsSuppressed: 0,
    redirects: [],
    suppressedAugmentations: [],
    diagnostics: [],
  };
}
