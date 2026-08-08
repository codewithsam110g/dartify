import * as ts from "ts-morph";
import {
  IRCallSignature,
  IRConstructSignature,
  IRParameter,
  IRTypeParam,
} from "@ir/signature";
import { ParseContext } from "./context";
import { nodeMetadata, visibilityOf } from "./metadata";
import { parseType } from "@typeParser/type";

interface SignatureNode extends ts.Node {
  getParameters(): ts.ParameterDeclaration[];
  getTypeParameters(): ts.TypeParameterDeclaration[];
  getReturnTypeNode(): ts.TypeNode | undefined;
}

function parameterJsDocOf(
  node: ts.Node,
  parameterName: string,
): string | undefined {
  const docs = (node as ts.Node & { getJsDocs?: () => ts.JSDoc[] })
    .getJsDocs?.() ?? [];
  const tags = docs
    .flatMap((doc) => doc.getTags())
    .filter(ts.Node.isJSDocParameterTag)
    .filter((tag) => tag.getName() === parameterName)
    .map((tag) => tag.getText());
  return tags.length > 0 ? tags.join("\n") : undefined;
}

export function parseTypeParameters(
  node: { getTypeParameters(): ts.TypeParameterDeclaration[] },
  context: ParseContext,
  depth: number = 0,
): IRTypeParam[] {
  return node.getTypeParameters().map((parameter, index) => {
    const parameterContext = context.child(
      `typeParam_${index}_${parameter.getName()}`,
    );
    const constraintNode = parameter.getConstraint();
    const defaultNode = parameter.getDefault();
    return {
      ...nodeMetadata(parameter),
      name: parameter.getName(),
      ...(constraintNode
        ? {
            constraint: parseType(
              constraintNode,
              depth + 1,
              parameterContext.child("constraint"),
            ),
          }
        : {}),
      ...(defaultNode
        ? {
            default: parseType(
              defaultNode,
              depth + 1,
              parameterContext.child("default"),
            ),
          }
        : {}),
    };
  });
}

export function parseParameter(
  parameter: ts.ParameterDeclaration,
  context: ParseContext,
  depth: number = 0,
  jsDoc?: string,
): IRParameter {
  const nameNode = parameter.getNameNode();
  const bindingPattern = ts.Node.isObjectBindingPattern(nameNode)
    ? { kind: "object" as const, text: nameNode.getText() }
    : ts.Node.isArrayBindingPattern(nameNode)
      ? { kind: "array" as const, text: nameNode.getText() }
      : undefined;
  const initializer = parameter.getInitializer();

  return {
    ...nodeMetadata(parameter),
    ...(jsDoc ? { jsDoc } : {}),
    name: parameter.getName(),
    type: parseType(parameter.getTypeNode(), depth + 1, context),
    isOptional: parameter.isOptional(),
    isRest: parameter.isRestParameter(),
    ...(bindingPattern ? { bindingPattern } : {}),
    ...(initializer ? { initializerText: initializer.getText() } : {}),
  };
}

export function parseParameters(
  node: ts.Node & { getParameters(): ts.ParameterDeclaration[] },
  context: ParseContext,
  depth: number = 0,
): IRParameter[] {
  return node
    .getParameters()
    .filter(
      (parameter) =>
        parameter.getNameNode().getKind() !== ts.SyntaxKind.ThisKeyword,
    )
    .map((parameter, index) =>
      parseParameter(
        parameter,
        context.child(`param_${index}_${parameter.getName()}`),
        depth,
        parameterJsDocOf(node, parameter.getName()),
      ),
    );
}

export function parseCallSignature(
  node: SignatureNode,
  context: ParseContext,
  depth: number = 0,
): IRCallSignature {
  return {
    ...nodeMetadata(node),
    typeParams: parseTypeParameters(node, context, depth),
    parameters: parseParameters(node, context, depth),
    returnType: parseType(
      node.getReturnTypeNode(),
      depth + 1,
      context.child("return"),
    ),
  };
}

export function parseConstructSignature(
  node: SignatureNode,
  context: ParseContext,
  includeReturnType: boolean,
  depth: number = 0,
): IRConstructSignature {
  const visibility = visibilityOf(node);
  return {
    ...nodeMetadata(node),
    typeParams: parseTypeParameters(node, context, depth),
    parameters: parseParameters(node, context, depth),
    ...(includeReturnType
      ? {
          returnType: parseType(
            node.getReturnTypeNode(),
            depth + 1,
            context.child("return"),
          ),
        }
      : {}),
    ...(visibility ? { visibility } : {}),
  };
}
