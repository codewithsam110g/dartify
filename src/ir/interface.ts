import { IRType } from "./type";
import { IRDeclaration, IRDeclKind } from "./declaration";
import { IRBindingName, IRNode, IRVisibility } from "./node";
import {
  IRCallSignature,
  IRConstructSignature,
  IRParameter,
  IRTypeParam,
} from "./signature";

export interface IRInterface extends IRDeclaration, IRBindingName {
  kind: IRDeclKind.Interface;
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

export interface IRProperties extends IRNode, IRBindingName {
  type: IRType;
  isOptional: boolean;
  isReadonly: boolean;
  isStatic: boolean;
  isAbstract: boolean;
  visibility?: IRVisibility;
}

export interface IRMethod extends IRNode, IRBindingName {
  typeParams: IRTypeParam[];
  parameters: IRParameter[];
  returnType: IRType;
  isOptional: boolean;
  isStatic: boolean;
  isAbstract: boolean;
  visibility?: IRVisibility;
}

export interface IRGetAccessor extends IRNode, IRBindingName {
  type: IRType;
  isStatic: boolean;
  isAbstract: boolean;
  visibility?: IRVisibility;
}

export interface IRSetAccessor extends IRNode, IRBindingName {
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
