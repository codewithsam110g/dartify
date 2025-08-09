import { IRClass } from "./class";
import { IREnum } from "./enum";
import { IRFunction } from "./function";
import { IRInterface } from "./interface";
import { IRTypeAlias } from "./typealias";
import { IRVariable } from "./variable";

export enum IRDeclKind {
  Interface = "interface",
  TypeAlias = "typeAlias",
  Class = "class",
  Function = "function",
  Variable = "variable",
  Enum = "enum",
}

export interface IRDeclaration {
  kind: IRDeclKind;
}

export type IRDeclarationUnion =
  | IRInterface
  | IRTypeAlias
  | IRClass
  | IRFunction
  | IRVariable
  | IREnum;

export function deepCloneIRDeclaration(
  declaration: IRDeclaration,
): IRDeclarationUnion {
  // First, perform a deep clone using JSON parse/stringify
  const cloned = JSON.parse(JSON.stringify(declaration)) as IRDeclaration;

  // Return the correctly typed instance based on kind
  switch (cloned.kind) {
    case IRDeclKind.Interface:
      return cloned as IRInterface;

    case IRDeclKind.TypeAlias:
      return cloned as IRTypeAlias;

    case IRDeclKind.Class:
      return cloned as IRClass;

    case IRDeclKind.Function:
      return cloned as IRFunction;

    case IRDeclKind.Variable:
      return cloned as IRVariable;

    case IRDeclKind.Enum:
      return cloned as IREnum;

    default:
      // This should never happen if all enum values are handled
      throw new Error(`Unknown IRDeclKind: ${(cloned as any).kind}`);
  }
}
