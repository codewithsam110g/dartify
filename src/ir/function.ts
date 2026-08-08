import { IRType } from "./type";
import { IRDeclaration, IRDeclKind } from "./declaration";
import { IRParameter, IRTypeParam } from "./signature";

export interface IRFunction extends IRDeclaration {
  kind: IRDeclKind.Function;
  name: string;
  typeParams: IRTypeParam[];
  parameters: IRParameter[];
  returnType: IRType;
}
