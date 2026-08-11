import { IRType } from "./type";
import { IRDeclaration, IRDeclKind } from "./declaration";
import { IRBindingName } from "./node";

export interface IRVariable extends IRDeclaration, IRBindingName {
  kind: IRDeclKind.Variable;
  type: IRType;
  declarationKind: "var" | "let" | "const";
  isConst: boolean;
}
