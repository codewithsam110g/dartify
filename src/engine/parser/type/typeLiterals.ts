import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import {
  IRGetAccessor,
  IRIndexSignatures,
  IRInterface,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "@ir/interface";
import { IRDeclKind } from "@ir/declaration";
import { ParseContext } from "@parser/context";
import { nodeMetadata } from "@parser/metadata";
import {
  parseCallSignature,
  parseConstructSignature,
  parseParameter,
  parseParameters,
  parseTypeParameters,
} from "@parser/signature";
import { parseType } from "./type";

export function handleTypeLiterals(
  node: ts.TypeLiteralNode,
  depth: number,
  context: ParseContext,
): IRType {
  if (node.getMembers().length === 0) {
    return {
      ...nodeMetadata(node),
      kind: TypeKind.Any,
      name: TypeKind.Any,
      isNullable: false,
    };
  }

  const properties: IRProperties[] = node
    .getProperties()
    .map((property, index) => {
      const memberContext = context.child(
        `property_${index}_${property.getName()}`,
      );
      return {
        ...nodeMetadata(property),
        name: property.getName(),
        type: parseType(property.getTypeNode(), depth + 1, memberContext),
        isReadonly: property.isReadonly(),
        isOptional: property.hasQuestionToken(),
        isStatic: false,
        isAbstract: false,
      };
    });

  const methods: IRMethod[] = node.getMethods().map((method, index) => {
    const memberContext = context.child(`method_${index}_${method.getName()}`);
    return {
      ...nodeMetadata(method),
      name: method.getName(),
      typeParams: parseTypeParameters(method, memberContext, depth),
      parameters: parseParameters(method, memberContext, depth),
      returnType: parseType(
        method.getReturnTypeNode(),
        depth + 1,
        memberContext.child("return"),
      ),
      isOptional: method.hasQuestionToken(),
      isStatic: false,
      isAbstract: false,
    };
  });

  const callSignatures = node
    .getCallSignatures()
    .map((signature, index) =>
      parseCallSignature(signature, context.child(`call_${index}`), depth),
    );

  const constructSignatures = node
    .getConstructSignatures()
    .map((signature, index) =>
      parseConstructSignature(
        signature,
        context.child(`constructor_${index}`),
        true,
        depth,
      ),
    );

  const getAccessors: IRGetAccessor[] = node
    .getGetAccessors()
    .map((accessor, index) => {
      const memberContext = context.child(
        `getter_${index}_${accessor.getName()}`,
      );
      return {
        ...nodeMetadata(accessor),
        name: accessor.getName(),
        type: parseType(
          accessor.getReturnTypeNode(),
          depth + 1,
          memberContext,
        ),
        isStatic: false,
        isAbstract: false,
      };
    });

  const setAccessors: IRSetAccessor[] = node
    .getSetAccessors()
    .map((accessor, index) => {
      const memberContext = context.child(
        `setter_${index}_${accessor.getName()}`,
      );
      return {
        ...nodeMetadata(accessor),
        name: accessor.getName(),
        parameter: parseParameter(
          accessor.getParameters()[0],
          memberContext,
          depth,
        ),
        isStatic: false,
        isAbstract: false,
      };
    });

  const indexSignatures: IRIndexSignatures[] = node
    .getIndexSignatures()
    .map((signature, index) => {
      const memberContext = context.child(`indexSig_${index}`);
      return {
        ...nodeMetadata(signature),
        keyType: parseType(
          signature.getKeyTypeNode(),
          depth + 1,
          memberContext.child("key"),
        ),
        valueType: parseType(
          signature.getReturnTypeNode(),
          depth + 1,
          memberContext.child("value"),
        ),
        isReadonly: signature.isReadonly(),
      };
    });

  const [filePath, scopePath] = context.scopeFQN.split("::");
  const safeScopeName = (scopePath || "Global")
    .replace(/["']/g, "")
    .replace(/\|/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  const anonymousName = `Anon_${safeScopeName}`;
  const anonymousFQN = `${filePath}::${anonymousName}`;

  const anonymousInterface: IRInterface = {
    ...nodeMetadata(node),
    kind: IRDeclKind.Interface,
    modifiers: {
      exportKind: "none",
      isDeclare: false,
      isAmbient: node.getSourceFile().isDeclarationFile(),
    },
    name: anonymousName,
    typeParams: [],
    extends: [],
    properties,
    methods,
    callSignatures,
    constructSignatures,
    getAccessors,
    setAccessors,
    indexSignatures,
  };

  context.registerHoisted(anonymousFQN, anonymousInterface);

  return {
    ...nodeMetadata(node),
    kind: TypeKind.TypeReference,
    name: anonymousName,
    isNullable: false,
    genericArgs: [],
    reference: {
      writtenName: anonymousName,
      lookup: { kind: "checker", candidates: [anonymousFQN] },
    },
  };
}
