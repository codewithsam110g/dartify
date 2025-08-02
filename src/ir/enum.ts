import { IRDeclaration, IRDeclKind } from "./declaration";

export interface IREnum extends IRDeclaration {
  kind: IRDeclKind.Enum;
  name: string;
  members: {
    name: string;
    value?: string | number;
  }[];
}
