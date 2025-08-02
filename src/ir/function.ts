import * as ts from "ts-morph";
import { IRType } from "./type";
import { IRDeclaration, IRDeclKind } from "./declaration";

export interface IRFunction extends IRDeclaration{
  kind: IRDeclKind.Function;
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

