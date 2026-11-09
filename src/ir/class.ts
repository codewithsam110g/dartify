import { IRDeclaration, IRDeclKind } from "./declaration";
import {
  IRMethod,
  IRProperties,
  IRGetAccessor,
  IRIndexSignatures,
  IRSetAccessor,
} from "./interface";
import { IRHostTypeIdentity, IRType } from "./type";
import { IRConstructSignature, IRTypeParam } from "./signature";
import { IRBindingName } from "./node";

export interface IRClass extends IRDeclaration, IRBindingName {
  kind: IRDeclKind.Class;
  extends?: IRType;
  implements: IRType[];
  isAbstract: boolean;
  typeParams: IRTypeParam[];
  /**
   * Set on a class the semantic pass built from an augmenting global interface
   * and its constructor-shaped value (`interface Window { … }` +
   * `declare var Window: { new (): Window; … }`): the identity of the host type
   * the interface merges with, carried over from `IRInterface.hostAugmentation`
   * so a backend that maps the host type to a platform class still sees an
   * augmentation (HD-23).
   */
  hostAugmentation?: IRHostTypeIdentity;

  constructors: IRConstructSignature[];
  properties: IRProperties[];
  methods: IRMethod[];
  getAccessors: IRGetAccessor[];
  setAccessors: IRSetAccessor[];
  indexSignatures: IRIndexSignatures[];
}
