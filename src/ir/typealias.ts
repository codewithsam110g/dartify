import { IRDeclaration, IRDeclKind } from "./declaration";
import { IRType } from "./type";

export interface IRTypeAlias extends IRDeclaration{
  kind: IRDeclKind.TypeAlias;
  name: string;
  type: IRType;
}
