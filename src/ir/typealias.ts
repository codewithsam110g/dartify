import { IRDeclaration, IRDeclKind } from "./declaration";
import { IRType } from "./type";
import { IRTypeParam } from "./signature";
import { IRBindingName } from "./node";

export interface IRTypeAlias extends IRDeclaration, IRBindingName {
  kind: IRDeclKind.TypeAlias;
  typeParams: IRTypeParam[];
  type: IRType;
}
