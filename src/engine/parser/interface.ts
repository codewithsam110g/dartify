import * as ts from "ts-morph";
import {
  IRGetAccessor,
  IRIndexSignatures,
  IRInterface,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "@ir/interface";
import { parseType } from "@typeParser/type";
import { IRDeclKind } from "@ir/index";
import { declarationParseContext, ParseContext } from "./context";
import { declarationModifiersOf, nodeMetadata } from "./metadata";
import {
  parseCallSignature,
  parseConstructSignature,
  parseParameter,
  parseParameters,
  parseTypeParameters,
} from "./signature";

export function parseInterface(
  declaration: ts.InterfaceDeclaration,
  context: ParseContext = declarationParseContext(
    declaration,
    declaration.getName(),
  ),
): IRInterface {
  const properties: IRProperties[] = declaration.getProperties().map((node) => {
    const memberContext = context.child(node.getName());
    return {
      ...nodeMetadata(node),
      name: node.getName(),
      type: parseType(node.getTypeNode(), 0, memberContext),
      isReadonly: node.isReadonly(),
      isOptional: node.hasQuestionToken(),
      isStatic: false,
      isAbstract: false,
    };
  });

  const methods: IRMethod[] = declaration.getMethods().map((node, index) => {
    const memberContext = context.child(`method_${index}_${node.getName()}`);
    return {
      ...nodeMetadata(node),
      name: node.getName(),
      typeParams: parseTypeParameters(node, memberContext),
      parameters: parseParameters(node, memberContext),
      returnType: parseType(
        node.getReturnTypeNode(),
        0,
        memberContext.child("return"),
      ),
      isOptional: node.hasQuestionToken(),
      isStatic: false,
      isAbstract: false,
    };
  });

  const callSignatures = declaration
    .getCallSignatures()
    .map((node, index) =>
      parseCallSignature(node, context.child(`call_${index}`)),
    );

  const constructSignatures = declaration
    .getConstructSignatures()
    .map((node, index) =>
      parseConstructSignature(
        node,
        context.child(`constructor_${index}`),
        true,
      ),
    );

  const getAccessors: IRGetAccessor[] = declaration
    .getGetAccessors()
    .map((node) => {
      const memberContext = context.child(node.getName());
      return {
        ...nodeMetadata(node),
        name: node.getName(),
        type: parseType(node.getReturnTypeNode(), 0, memberContext),
        isStatic: false,
        isAbstract: false,
      };
    });

  const setAccessors: IRSetAccessor[] = declaration
    .getSetAccessors()
    .map((node) => {
      const memberContext = context.child(node.getName());
      return {
        ...nodeMetadata(node),
        name: node.getName(),
        parameter: parseParameter(node.getParameters()[0], memberContext),
        isStatic: false,
        isAbstract: false,
      };
    });

  const indexSignatures: IRIndexSignatures[] = declaration
    .getIndexSignatures()
    .map((node) => {
      const memberContext = context.child("indexSig");
      return {
        ...nodeMetadata(node),
        keyType: parseType(node.getKeyTypeNode(), 0, memberContext),
        valueType: parseType(node.getReturnTypeNode(), 0, memberContext),
        isReadonly: node.isReadonly(),
      };
    });

  return {
    ...nodeMetadata(declaration),
    kind: IRDeclKind.Interface,
    modifiers: declarationModifiersOf(declaration),
    name: declaration.getName(),
    typeParams: parseTypeParameters(declaration, context),
    extends: declaration
      .getExtends()
      .map((heritage) => parseType(heritage, 0, context)),
    properties,
    methods,
    callSignatures,
    constructSignatures,
    getAccessors,
    setAccessors,
    indexSignatures,
  };
}
