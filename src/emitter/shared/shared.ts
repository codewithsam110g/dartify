import { IRParameter } from "../../ir/function";
import { TypeNode, SyntaxKind, Node } from "ts-morph";
import { emitType } from "../../type/emitter/old/emit";
import { parseType } from "../../type/parser/type";

export function returnTypeAliasName(typeNode?: TypeNode): string {
  if (typeNode == undefined) return "";
  let res = getTypeAliasName(typeNode);
  if (res == null) {
    return emitType(parseType(typeNode));
  } else {
    return res;
  }
}

function getTypeAliasName(typeNode: TypeNode): string | null {
  // Handle direct type references (e.g., MyType)
  if (typeNode.getKind() === SyntaxKind.TypeReference) {
    const typeRef = typeNode.asKindOrThrow(SyntaxKind.TypeReference);
    const typeName = typeRef.getTypeName();

    if (Node.isIdentifier(typeName)) {
      const typeNameText = typeName.getText();

      // Handle Array<T> syntax
      if (typeNameText === "Array") {
        const typeArgs = typeRef.getTypeArguments();
        if (typeArgs && typeArgs.length > 0) {
          const firstTypeArg = typeArgs[0];
          const innerTypeName = getTypeAliasName(firstTypeArg);
          if (innerTypeName) {
            return `List<${innerTypeName}>`;
          }
        }
      }

      return typeNameText;
    } else if (Node.isQualifiedName(typeName)) {
      return typeName.getRight().getText();
    }
  }

  // Handle array types (e.g., MyType[])
  if (typeNode.getKind() === SyntaxKind.ArrayType) {
    const arrayType = typeNode.asKindOrThrow(SyntaxKind.ArrayType);
    const elementType = arrayType.getElementTypeNode();
    const elementTypeName = getTypeAliasName(elementType);
    if (elementTypeName) {
      return `List<${elementTypeName}>`;
    }
  }

  return null;
}

export function formatParameterList(params: IRParameter[]): string {
  const requiredParams: string[] = [];
  const optionalParams: string[] = [];

  params.forEach((p) => {
    let type: string;
    // Check if we have typeBefore and can extract a type alias name
    if (p.typeBefore) {
      const typeAliasName = getTypeAliasName(p.typeBefore);
      if (typeAliasName) {
        type = typeAliasName;
      } else {
        type = emitType(p.typeAfter) || "dynamic";
      }
    } else {
      type = emitType(p.typeAfter) || "dynamic";
    }

    let result = `${type} ${p.name}`;
    if (p.isRest) {
      // Dart doesn't support rest parameters, so mark for review
      result = `/* rest */ ${result}`;
    }

    if (p.isOptional) {
      optionalParams.push(result);
    } else {
      requiredParams.push(result);
    }
  });

  // Combine required and optional parameters
  const parts: string[] = [];
  if (requiredParams.length > 0) {
    parts.push(requiredParams.join(", "));
  }
  if (optionalParams.length > 0) {
    parts.push("[" + optionalParams.join(", ") + "]");
  }

  return parts.join(", ");
}
