import { IRVariable } from "@ir/variable";
import { emitType } from "@typeEmitter/emit";
import { dartName, qualifiedJsName } from "../shared/names";

export function emitVariable(
  irVariable: IRVariable,
  prefix: string,
  debug: boolean = false,
): string {
  const internalVal = qualifiedJsName(irVariable, prefix);
  const jsAnnotation = `@JS("${internalVal}")`;
  return `${jsAnnotation}\nexternal ${emitType(irVariable.type)} ${dartName(irVariable)};`;
}
