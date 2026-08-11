import { IRFunction } from "@ir/function";
import { formatParameterList, returnTypeAliasName } from "../shared/shared";
import { dartName, qualifiedJsName } from "../shared/names";

export function emitFunction(
  irFunction: IRFunction,
  prefix: string,
  debug: boolean = false,
): string {
  const internalVal = qualifiedJsName(irFunction, prefix);
  const jsAnnotation = `@JS("${internalVal}")`;
  const paramText = formatParameterList(irFunction.parameters);
  const returnType = returnTypeAliasName(irFunction.returnType);
  return `${jsAnnotation}\nexternal ${returnType} ${dartName(irFunction)}(${paramText});`;
}
