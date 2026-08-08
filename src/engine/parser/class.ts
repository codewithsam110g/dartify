import * as ts from "ts-morph";
import { IRClass } from "@ir/class";
import {
  IRGetAccessor,
  IRIndexSignatures,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "@ir/interface";
import { parseType } from "@typeParser/type";
import { IRDeclKind } from "@ir/index";
import { declarationParseContext, ParseContext } from "./context";
import {
  declarationModifiersOf,
  nodeMetadata,
  visibilityOf,
} from "./metadata";
import {
  parseConstructSignature,
  parseParameter,
  parseParameters,
  parseTypeParameters,
} from "./signature";

export function parseClass(
  declaration: ts.ClassDeclaration,
  context: ParseContext = declarationParseContext(
    declaration,
    declaration.getName() || "Error_Class",
  ),
): IRClass {
  const extendsNode = declaration.getExtends();
  const properties: IRProperties[] = declaration.getProperties().map((node) => {
    const memberContext = context.child(node.getName());
    return {
      ...nodeMetadata(node),
      name: node.getName(),
      type: parseType(node.getTypeNode(), 0, memberContext),
      isReadonly: node.isReadonly(),
      isOptional: node.hasQuestionToken(),
      isStatic: node.isStatic(),
      isAbstract: node.isAbstract(),
      visibility: visibilityOf(node),
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
      isStatic: node.isStatic(),
      isAbstract: node.isAbstract(),
      visibility: visibilityOf(node),
    };
  });

  const constructors = declaration.getConstructors().map((node, index) =>
    parseConstructSignature(
      node,
      context.child(`constructor_${index}`),
      false,
    ),
  );

  const getAccessors: IRGetAccessor[] = declaration
    .getGetAccessors()
    .map((node) => {
      const memberContext = context.child(node.getName());
      return {
        ...nodeMetadata(node),
        name: node.getName(),
        type: parseType(
          node.getReturnTypeNode(),
          0,
          memberContext.child("return"),
        ),
        isStatic: node.isStatic(),
        isAbstract: node.isAbstract(),
        visibility: visibilityOf(node),
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
        isStatic: node.isStatic(),
        isAbstract: node.isAbstract(),
        visibility: visibilityOf(node),
      };
    });

  const indexSignatures: IRIndexSignatures[] = declaration
    .getChildrenOfKind(ts.SyntaxKind.IndexSignature)
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
    kind: IRDeclKind.Class,
    modifiers: declarationModifiersOf(declaration),
    name: declaration.getName() || "",
    extends: extendsNode ? parseType(extendsNode, 0, context) : undefined,
    implements: declaration
      .getImplements()
      .map((heritage) => parseType(heritage, 0, context)),
    isAbstract: declaration.isAbstract(),
    typeParams: parseTypeParameters(declaration, context),
    constructors,
    properties,
    methods,
    getAccessors,
    setAccessors,
    indexSignatures,
  };
}
