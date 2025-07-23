import * as fs from "fs";
import { IRVariable } from "../../ir/variable";
import { stripQuotes } from "../../utils/utils";
import { emitType } from "../../type/emitter/old/emit";

export function emitVariable(irVariable: IRVariable, prefix: string, filePath: string, debug : boolean = false){
  const internalVal = stripQuotes(
    `${prefix}${irVariable.name}`,
  );
  const jsAnnotation = `@JS("${internalVal}")`;
  let var_res = `${jsAnnotation}\nexternal ${emitType(irVariable.typeAfter)} ${irVariable.name};\n`;
  fs.appendFileSync(filePath, var_res, 'utf-8');
}