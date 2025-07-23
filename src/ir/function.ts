import * as ts from "ts-morph";
import { IRType } from "./type";

export interface IRFunction {
  name: string;
  parameters: IRParameter[];
  returnType: IRType;
  returnTypeNode?: ts.TypeNode;
}

export interface IRParameter {
  name: string;
  typeBefore?: ts.TypeNode;
  typeAfter: IRType;
  isOptional: boolean;
  isRest: boolean;
}

