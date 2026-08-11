export interface IRSourceLocation {
  file: string;
  line: number;
  column: number;
}

/** Metadata shared by parsed declarations, members and type nodes. */
export interface IRNode {
  /** Synthetic linker/parser nodes may not have a direct source location. */
  loc?: IRSourceLocation;
  /** Original TypeScript JSDoc text. Backend-specific conversion happens later. */
  jsDoc?: string;
}

/** Source and target-language identities carried without rewriting source IR. */
export interface IRBindingName {
  /** Identifier exactly as written in the TypeScript declaration. */
  name: string;
  /** Dart-visible identifier assigned by the semantic layer. */
  dartName?: string;
  /** Exact JavaScript identifier retained when the Dart name changes. */
  jsName?: string;
}

export type IRVisibility = "public" | "protected" | "private";

export type IRExportKind = "none" | "named" | "default";

export interface IRDeclarationModifiers {
  exportKind: IRExportKind;
  /** Whether the declaration itself contains the `declare` keyword. */
  isDeclare: boolean;
  /** Whether TypeScript treats the declaration as ambient, including parents. */
  isAmbient: boolean;
}
