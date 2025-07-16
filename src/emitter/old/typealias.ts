import * as fs from "fs";
import { IRTypeAlias } from "../../ir/typealias";

export function emitTypeAlias(
  irTypeAlias: IRTypeAlias,
  prefix: string,
  filePath: string,
  debug = false,
) {
  let typeAlias_res = `typedef ${irTypeAlias.name} = ${irTypeAlias.typeAfter};\n`;
  fs.appendFileSync(filePath, typeAlias_res, "utf-8");
}
