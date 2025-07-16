import * as fs from "fs";
import { IRFunction } from "../../ir/function";
import { stripQuotes } from "../../utils/utils";
import { formatParameterList,returnTypeAliasName } from "../shared/shared";

export function emitFunction(
  irFunction: IRFunction,
  prefix: string,
  filePath: string,
  debug: boolean = false,
) {
  const internalVal = stripQuotes(`${prefix}${irFunction.name}`);
  const jsAnnotation = `@JS("${internalVal}")`;
  const paramText = formatParameterList(irFunction.parameters);
  const returnType = returnTypeAliasName(irFunction.returnTypeNode);
  let func_res =  `${jsAnnotation}\nexternal ${returnType} ${irFunction.name}(${paramText});\n`;
  fs.appendFileSync(filePath, func_res, 'utf-8')
}
