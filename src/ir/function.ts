import * as ts from "ts-morph";

export interface IRFunction {
  name: string;
  parameters: IRParameter[];
  returnType: string;
  returnTypeNode?: ts.TypeNode;
}

export interface IRParameter {
  name: string;
  typeBefore?: ts.TypeNode;
  typeAfter: string;
  isOptional: boolean;
  isRest: boolean;
}

