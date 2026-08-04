export type ModuleReferenceKind = "import" | "export" | "path" | "types";

export interface ModuleResolutionIssue {
  file: string;
  specifier: string;
  kind: ModuleReferenceKind;
  reason: "notFound" | "ambiguousExplicitInput";
  candidates?: string[];
}

export interface ModuleFallbackResolution {
  file: string;
  specifier: string;
  resolvedFile: string;
  strategy: "relativeDeclaration" | "explicitInput";
}

export interface ResolutionReport {
  inputFiles: string[];
  packageDependencies: string[];
  stdlibFiles: string[];
  unresolved: ModuleResolutionIssue[];
  fallbacks: ModuleFallbackResolution[];
}
