import { IRFunction } from "../../ir/function";
import { stripQuotes } from "../../utils/utils";
import { formatParameterList, returnTypeAliasName } from "../shared/shared";

export function emitFunction(
  irFunction: IRFunction,
  prefix: string,
  debug: boolean = false,
): string {
  const internalVal = stripQuotes(`${prefix}${irFunction.name}`);
  const jsAnnotation = `@JS("${internalVal}")`;
  const paramText = formatParameterList(irFunction.parameters);
  const returnType = returnTypeAliasName(irFunction.returnTypeNode);
  return `${jsAnnotation}\nexternal ${returnType} ${irFunction.name}(${paramText});`;
}
