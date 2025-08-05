import { IRVariable } from "../../ir/variable";
import { stripQuotes } from "../../utils/utils";
import { emitType } from "../../type/emitter/old/emit";

export function emitVariable(
  irVariable: IRVariable,
  prefix: string,
  debug: boolean = false,
): string {
  const internalVal = stripQuotes(`${prefix}${irVariable.name}`);
  const jsAnnotation = `@JS("${internalVal}")`;
  return `${jsAnnotation}\nexternal ${emitType(irVariable.type)} ${irVariable.name};`;
}
