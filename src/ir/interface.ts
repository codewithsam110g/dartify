import { IRType } from "./type";
import { IRDeclaration, IRDeclKind } from "./declaration";
import { IRNode, IRVisibility } from "./node";
import {
  IRCallSignature,
  IRConstructSignature,
  IRParameter,
  IRTypeParam,
} from "./signature";

export interface IRInterface extends IRDeclaration {
  kind: IRDeclKind.Interface;
  name: string;
  typeParams: IRTypeParam[];
  extends: IRType[];
  properties: IRProperties[];
  methods: IRMethod[];
  callSignatures: IRCallSignature[];
  constructSignatures: IRConstructSignature[];
  getAccessors: IRGetAccessor[];
  setAccessors: IRSetAccessor[];
  indexSignatures: IRIndexSignatures[];
}

export interface IRProperties extends IRNode {
  name: string;
  type: IRType;
  isOptional: boolean;
  isReadonly: boolean;
  isStatic: boolean;
  isAbstract: boolean;
  visibility?: IRVisibility;
}

export interface IRMethod extends IRNode {
  name: string;
  typeParams: IRTypeParam[];
  parameters: IRParameter[];
  returnType: IRType;
  isOptional: boolean;
  isStatic: boolean;
  isAbstract: boolean;
  visibility?: IRVisibility;
}

export interface IRGetAccessor extends IRNode {
  name: string;
  type: IRType;
  isStatic: boolean;
  isAbstract: boolean;
  visibility?: IRVisibility;
}

export interface IRSetAccessor extends IRNode {
  name: string;
  parameter: IRParameter;
  isStatic: boolean;
  isAbstract: boolean;
  visibility?: IRVisibility;
}

export interface IRIndexSignatures extends IRNode {
  keyType: IRType;
  valueType: IRType;
  isReadonly: boolean;
}
