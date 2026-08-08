import { IRDeclaration, IRDeclKind } from "./declaration";
import { IRType } from "./type";
import { IRTypeParam } from "./signature";

export interface IRTypeAlias extends IRDeclaration {
  kind: IRDeclKind.TypeAlias;
  name: string;
  typeParams: IRTypeParam[];
  type: IRType;
}
