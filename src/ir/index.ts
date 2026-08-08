export type { IRClass } from "./class";
export type { IRFunction } from "./function";
export type {
  IRBindingPattern,
  IRCallSignature,
  IRConstructSignature,
  IRParameter,
  IRTypeParam,
} from "./signature";
export type {
  IRDeclarationModifiers,
  IRExportKind,
  IRNode,
  IRSourceLocation,
  IRVisibility,
} from "./node";
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
