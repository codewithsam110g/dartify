import { IRTypeAlias } from "../../ir/typealias";

export function emitTypeAlias(
  irTypeAlias: IRTypeAlias,
  prefix: string,
  debug = false,
):string {
  return `typedef ${irTypeAlias.name} = ${irTypeAlias.typeAfter};`;  
}
