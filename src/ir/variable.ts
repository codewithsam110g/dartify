import * as ts from "ts-morph";
import { IRType } from "./type";
import { IRDeclaration, IRDeclKind } from "./declaration";

export interface IRVariable extends IRDeclaration {
  kind: IRDeclKind.Variable;
  name: string;
  typeBefore: ts.TypeNode | undefined;
  typeAfter: IRType;
  isReadonly: boolean;
  isConst: boolean;
}
