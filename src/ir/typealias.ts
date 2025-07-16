import * as ts from "ts-morph";

export interface IRTypeAlias {
  name: string;
  typeBefore: ts.TypeNode | undefined;
  typeAfter: string;
}
