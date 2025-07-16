import { IRParameter } from "./function";
import {
  IRMethod,
  IRProperties,
  IRGetAccessor,
  IRSetAccessor,
} from "./interface";

export interface IRClass {
  name: string;
  extends?: string;
  implements: string[];
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
