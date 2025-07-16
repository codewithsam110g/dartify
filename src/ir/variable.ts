import * as ts from "ts-morph";

export interface IRVariable {
  name: string;
  typeBefore: ts.TypeNode | undefined;
  typeAfter: string;
  isReadonly: boolean;
  isConst: boolean;
}
