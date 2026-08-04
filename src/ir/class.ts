import { IRDeclaration, IRDeclKind } from "./declaration";
import { IRParameter } from "./function";
import {
  IRMethod,
  IRProperties,
  IRGetAccessor,
  IRSetAccessor,
} from "./interface";
import { IRType } from "./type";

export interface IRClass extends IRDeclaration{
  kind: IRDeclKind.Class;
  name: string;
  extends?: IRType;
  implements: IRType[];
  isAbstract: boolean;
  typeParams: string[];

  constructors: IRConstructor[];
  properties: IRProperties[];
  methods: IRMethod[];
  getAccessors: IRGetAccessor[];
  setAccessors: IRSetAccessor[];
}

export interface IRConstructor {
  parameters: IRParameter[];
  jsDoc?: string;
}
