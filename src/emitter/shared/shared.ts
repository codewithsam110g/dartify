import { IRParameter } from "../../ir/function";
import { TypeNode, SyntaxKind, Node } from "ts-morph";
import { emitType } from "../../type/emitter/old/emit";
import { parseType } from "../../type/parser/type";
import { IRType } from "../../ir/type";

export function returnTypeAliasName(irType: IRType): string {
  return emitType(irType);
}

export function formatParameterList(params: IRParameter[]): string {
  const requiredParams: string[] = [];
  const optionalParams: string[] = [];

  params.forEach((p) => {
    let type: string;
    // Check if we have typeBefore and can extract a type alias name
    type = emitType(p.type);

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

// For factory constructors of hoisted types
export function formatNamedParameters(params: IRParameter[]): string {
  if (params.length === 0) {
    return ""; // Return empty parens for no-arg factories
  }

  const paramStrings = params
    .map((p) => {
      const typeStr = emitType(p.type);
      const prefix = p.isOptional ? "" : "required ";
      return `${prefix}${typeStr} ${p.name}`;
    })
    .join(", ");

  return `{${paramStrings}}`;
}
