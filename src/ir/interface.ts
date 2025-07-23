import * as ts from "ts-morph";
import { IRParameter } from "./function";
import { IRType } from "./type";

export interface IRInterface {
  name: string;
  extends: string[];
  properties: IRProperties[];
  methods: IRMethod[];
  constructors: IRMethod[];
  getAccessors: IRGetAccessor[];
  setAccessors: IRSetAccessor[];
  indexSignatures: IRIndexSignatures[];
}

export interface IRProperties {
  name: string;
  typeBefore?: ts.TypeNode;
  typeAfter: IRType;
  isOptional: boolean;
  isReadonly: boolean;
  isStatic: boolean;
}

export interface IRMethod {
  name: string;
  parameters: IRParameter[];
  returnType: IRType;
  returnTypeNode?: ts.TypeNode;
  isOptional: boolean;
  isStatic: boolean;
}

export interface IRGetAccessor {
  name: string;
  typeBefore?: ts.TypeNode;
  typeAfter: IRType;
  isStatic: boolean;
}

export interface IRSetAccessor {
  name: string;
  parameter: IRParameter;
  isStatic: boolean;
}

export interface IRIndexSignatures {
  keyType: IRType;
  valueType: IRType;
  isReadonly: boolean;
}
