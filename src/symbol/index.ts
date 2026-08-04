import { IRDeclaration } from "@/ir";
import { IRReferenceTarget } from "@ir/type";

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
  /** Reference use sites owned by this declaration. */
  deps: IRReferenceTarget[];
  /** Unique, sorted real FQNs produced by the linker. */
  resolvedDeps: string[];
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
