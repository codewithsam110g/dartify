import { IRClass } from "./class";
import { IREnum } from "./enum";
import { IRFunction } from "./function";
import { IRInterface } from "./interface";
import { IRTypeAlias } from "./typealias";
import { IRVariable } from "./variable";
import { IRDeclarationModifiers, IRNode } from "./node";

export enum IRDeclKind {
  Interface = "interface",
  TypeAlias = "typeAlias",
  Class = "class",
  Function = "function",
  Variable = "variable",
  Enum = "enum",
}

export interface IRDeclaration extends IRNode {
  kind: IRDeclKind;
  modifiers: IRDeclarationModifiers;
}

export type IRDeclarationUnion =
  | IRInterface
  | IRTypeAlias
  | IRClass
  | IRFunction
  | IRVariable
  | IREnum;

export function deepCloneIRDeclaration<T extends IRDeclaration>(
  declaration: T,
): T {
  return structuredClone(declaration);
}
