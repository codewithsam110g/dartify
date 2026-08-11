import { IRDeclarationUnion } from "@/ir";
import { IRSourceLocation } from "@ir/node";
import { IRReferenceTarget } from "@ir/type";

export enum SymbolType {
  FUNCTION,
  CLASS,
  INTERFACE,
  VARIABLE,
  TYPE_ALIAS,
  ENUM,
}

/** The two namespaces TypeScript declarations can contribute to. */
export type SymbolNamespace = "type" | "value" | "both";

export type ModuleScope =
  | {
      kind: "namespace";
      /** Name as represented in the TypeScript declaration/FQN. */
      sourceName: string;
      /** Individual JS path segments, including dotted namespace names. */
      jsSegments: readonly string[];
    }
  | {
      kind: "externalModule";
      sourceName: string;
      specifier: string;
      isAugmentation: boolean;
      /** Stable module identity used by suppression diagnostics. */
      canonicalTarget: string;
    }
  | {
      kind: "global";
      sourceName: "global";
    };

export interface SymbolOrigin {
  filePath: string;
  scopes: readonly ModuleScope[];
  /** Stable registration order within the source file. */
  sourceOrder: number;
}

export interface SymbolProvenance {
  fqn: string;
  type: SymbolType;
  loc?: IRSourceLocation;
}

export interface SymbolFacet {
  type: SymbolType;
  namespace: SymbolNamespace;
  ir: IRDeclarationUnion;
  origin: SymbolOrigin;
  /** False only when analysis retains a declaration that must not emit. */
  emit: boolean;
  provenance: readonly SymbolProvenance[];
}

export interface Symbol {
  fqn: string;
  facets: readonly SymbolFacet[];
  /** Reference use sites owned by every facet in this semantic binding. */
  deps: IRReferenceTarget[];
  /** Unique, sorted real FQNs produced by the linker. */
  resolvedDeps: string[];
  /** True when the linker invented this binding for a degraded type. */
  minted?: boolean;
}

export function namespaceOfSymbolType(type: SymbolType): SymbolNamespace {
  switch (type) {
    case SymbolType.CLASS:
    case SymbolType.ENUM:
      return "both";
    case SymbolType.INTERFACE:
    case SymbolType.TYPE_ALIAS:
      return "type";
    case SymbolType.FUNCTION:
    case SymbolType.VARIABLE:
      return "value";
  }
}
