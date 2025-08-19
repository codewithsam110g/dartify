import { IRVariable } from "@ir/variable";
import { emitType } from "@typeEmitter/emit";
import { stripQuotes } from "@/utils/utils";

export function emitVariable(
  irVariable: IRVariable,
  prefix: string,
  debug: boolean = false,
): string {
  const internalVal = stripQuotes(`${prefix}${irVariable.name}`);
  const jsAnnotation = `@JS("${internalVal}")`;
  return `${jsAnnotation}\nexternal ${emitType(irVariable.type)} ${irVariable.name};`;
}
