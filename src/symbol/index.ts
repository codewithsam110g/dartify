import { IRDeclaration } from "@/ir";

export enum SymbolType {
  FUNCTION,
  CLASS,
  INTERFACE,
  VARIABLE,
  TYPE_ALIAS,
  ENUM,
}

export interface Symbol {
  type: SymbolType;
  fqn: string;
  ir: IRDeclaration;
  /** Pseudo-FQNs of type dependencies (e.g. "sourceFile::TypeName") */
  deps: string[];
}
