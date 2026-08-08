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

export interface IRClass extends IRDeclaration {
  kind: IRDeclKind.Class;
  name: string;
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
