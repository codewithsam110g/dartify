import * as ts from "ts-morph";
import { IRType } from "./type";

export interface IRVariable {
  name: string;
  typeBefore: ts.TypeNode | undefined;
  typeAfter: IRType;
  isReadonly: boolean;
  isConst: boolean;
}
