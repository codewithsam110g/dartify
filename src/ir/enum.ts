import { IRDeclaration, IRDeclKind } from "./declaration";
import { IRBindingName, IRNode } from "./node";

export type IREnumInitializer =
  | { kind: "implicit"; computedValue?: string | number }
  | { kind: "number"; text: string; value: number }
  | { kind: "string"; text: string; value: string }
  | { kind: "computed"; text: string; computedValue?: string | number };

export interface IREnumMember extends IRNode, IRBindingName {
  initializer: IREnumInitializer;
}

export interface IREnum extends IRDeclaration, IRBindingName {
  kind: IRDeclKind.Enum;
  /**
   * `const enum`: TypeScript inlines member values and normally erases the
   * runtime object (`P-16`). Backends lower members to compile-time constants
   * instead of runtime property reads.
   */
  isConst: boolean;
  members: IREnumMember[];
}
