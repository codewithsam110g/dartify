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
  /**
   * True when the linker invented this symbol rather than parsing it — the
   * typedefs minted for unrepresentable types (`E-16`).
   *
   * The emitter needs the distinction to decide *placement*: minted typedefs
   * are collected into the type-definitions section, while an author's own
   * `type X = keyof Y` stays where they wrote it. Both get the same
   * documenting comment, so the flag is not about presentation.
   */
  minted?: boolean;
}
