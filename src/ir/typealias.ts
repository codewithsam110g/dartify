import * as ts from "ts-morph";
import { IRDeclaration, IRDeclKind } from "./declaration";
import { IRType } from "./type";

export interface IRTypeAlias extends IRDeclaration{
  kind: IRDeclKind.TypeAlias;
  name: string;
  typeBefore: ts.TypeNode | undefined;
  typeAfter: IRType;
}
