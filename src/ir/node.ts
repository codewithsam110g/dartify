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

export type IRVisibility = "public" | "protected" | "private";

export type IRExportKind = "none" | "named" | "default";

export interface IRDeclarationModifiers {
  exportKind: IRExportKind;
  /** Whether the declaration itself contains the `declare` keyword. */
  isDeclare: boolean;
  /** Whether TypeScript treats the declaration as ambient, including parents. */
  isAmbient: boolean;
}
