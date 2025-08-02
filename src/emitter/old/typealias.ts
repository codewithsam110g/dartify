import { IRTypeAlias } from "../../ir/typealias";
import { emitType } from "../../type/emitter/old/emit";

export function emitTypeAlias(
  irTypeAlias: IRTypeAlias,
  prefix: string,
  debug = false,
):string {
  return `typedef ${irTypeAlias.name} = ${emitType(irTypeAlias.typeAfter)};`;  
}
