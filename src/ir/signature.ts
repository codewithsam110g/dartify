import type { IRNode } from "./node";
import type { IRVisibility } from "./node";
import type { IRType } from "./type";

export interface IRTypeParam extends IRNode {
  name: string;
  constraint?: IRType;
  default?: IRType;
}

export interface IRBindingPattern {
  kind: "object" | "array";
  text: string;
}

export interface IRParameter extends IRNode {
  /** Identifier or exact binding-pattern text as written in TypeScript. */
  name: string;
  type: IRType;
  isOptional: boolean;
  isRest: boolean;
  bindingPattern?: IRBindingPattern;
  initializerText?: string;
}

export interface IRCallSignature extends IRNode {
  typeParams: IRTypeParam[];
  parameters: IRParameter[];
  returnType: IRType;
}

/**
 * Shared by class constructors and TypeScript construct signatures.
 * A class constructor has no return type; `new (...) => T` does.
 */
export interface IRConstructSignature extends IRNode {
  typeParams: IRTypeParam[];
  parameters: IRParameter[];
  returnType?: IRType;
  visibility?: IRVisibility;
}
