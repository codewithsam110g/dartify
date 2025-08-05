import { IRType } from "./type";
import { IRDeclaration, IRDeclKind } from "./declaration";

export interface IRVariable extends IRDeclaration {
  kind: IRDeclKind.Variable;
  name: string;
  type: IRType;
  isReadonly: boolean;
  isConst: boolean;
}
