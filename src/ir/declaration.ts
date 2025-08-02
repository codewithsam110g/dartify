export enum IRDeclKind {
  Interface = "interface",
  TypeAlias = "typeAlias",
  Class = "class",
  Function = "function",
  Variable = "variable",
  Enum = "enum",
  Module = "module",
}

export interface IRDeclaration {
  kind: IRDeclKind;
}
