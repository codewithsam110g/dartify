export type { IRClass, IRConstructor } from "./class";
export type { IRFunction, IRParameter } from "./function";
export type { IREnum } from "./enum";
export type {
  IRInterface,
  IRGetAccessor,
  IRIndexSignatures,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "./interface";
export type { IRVariable } from "./variable";
export type { IRTypeAlias } from "./typealias";
export type { IRDeclaration, IRDeclarationUnion } from "./declaration";
export { IRDeclKind, deepCloneIRDeclaration } from "./declaration";
