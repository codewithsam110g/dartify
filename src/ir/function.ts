import { IRType } from "./type";
import { IRDeclaration, IRDeclKind } from "./declaration";
import { IRParameter, IRTypeParam } from "./signature";
import { IRBindingName } from "./node";

export interface IRFunction extends IRDeclaration, IRBindingName {
  kind: IRDeclKind.Function;
  typeParams: IRTypeParam[];
  parameters: IRParameter[];
  returnType: IRType;
}
