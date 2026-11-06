import { IRHostTypeIdentity, IRType } from "./type";
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
  /**
   * Set when this global interface merges with a declaration of the host
   * library (`interface Window { myProp: string }`): the identity of that host
   * type. A backend that maps the host type to a platform class treats the
   * members as additions to it instead of declaring a type of the same name.
   */
  hostAugmentation?: IRHostTypeIdentity;
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
