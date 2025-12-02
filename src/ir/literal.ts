import { IRType, IRParameter } from "./type";

export interface IRLiteral {
  properties: IRProperties[];
  methods: IRMethod[];
  constructors: IRMethod[];
  getAccessors: IRGetAccessor[];
  setAccessors: IRSetAccessor[];
  indexSignatures: IRIndexSignatures[];
}

export interface IRProperties {
  name: string;
  type: IRType;
  isOptional: boolean;
  isReadonly: boolean;
  isStatic: boolean;
}

export interface IRMethod {
  name: string;
  parameters: IRParameter[];
  returnType?: IRType;
  isOptional: boolean;
  isStatic: boolean;
}

export interface IRGetAccessor {
  name: string;
  type: IRType;
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
