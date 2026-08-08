import { IRDeclaration, IRDeclKind } from "./declaration";
import { IRNode } from "./node";

export type IREnumInitializer =
  | { kind: "implicit"; computedValue?: string | number }
  | { kind: "number"; text: string; value: number }
  | { kind: "string"; text: string; value: string }
  | { kind: "computed"; text: string; computedValue?: string | number };

export interface IREnumMember extends IRNode {
  name: string;
  initializer: IREnumInitializer;
}

export interface IREnum extends IRDeclaration {
  kind: IRDeclKind.Enum;
  name: string;
  members: IREnumMember[];
}
