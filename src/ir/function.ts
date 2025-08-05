import { IRType } from "./type";
import { IRDeclaration, IRDeclKind } from "./declaration";

export interface IRFunction extends IRDeclaration{
  kind: IRDeclKind.Function;
  name: string;
  parameters: IRParameter[];
  returnType: IRType;
}

export interface IRParameter {
  name: string;
  type: IRType;
  isOptional: boolean;
  isRest: boolean;
}

