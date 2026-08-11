import { IRDeclaration, IRDeclKind } from "./declaration";
import {
  IRMethod,
  IRProperties,
  IRGetAccessor,
  IRIndexSignatures,
  IRSetAccessor,
} from "./interface";
import { IRType } from "./type";
import { IRConstructSignature, IRTypeParam } from "./signature";
import { IRBindingName } from "./node";

export interface IRClass extends IRDeclaration, IRBindingName {
  kind: IRDeclKind.Class;
  extends?: IRType;
  implements: IRType[];
  isAbstract: boolean;
  typeParams: IRTypeParam[];

  constructors: IRConstructSignature[];
  properties: IRProperties[];
  methods: IRMethod[];
  getAccessors: IRGetAccessor[];
  setAccessors: IRSetAccessor[];
  indexSignatures: IRIndexSignatures[];
}
