import * as fs from "fs";
import { IREnum } from "../../ir/enum";
import { stripQuotes } from "../../utils/utils";

export function emitEnum(irEnum : IREnum, prefix:string, filePath : string, debug = false) {
  
  const internalVal = stripQuotes(
    `${prefix}${irEnum.name}`,
  );
  const jsAnnotation = `@JS("${internalVal}")`;

  // Generate Dart enum
  const members = irEnum.members
    .map((member) => {
      return `  external static ${inferDartType(member.value)} get ${member.name};`;
    })
    .join("\n");

  let enum_res = `${jsAnnotation}\nclass ${irEnum.name}{}\n${jsAnnotation}\nextension ${irEnum.name}Enum on ${irEnum.name}{\n${members}\n}\n`;
  fs.appendFileSync(filePath, enum_res, 'utf-8')
}

function inferDartType(value: string | number | undefined): string {
  if (typeof value === "number") return Number.isInteger(value) ? "int" : "double";
  if (typeof value === "string") return "String";
  return "dynamic"; // fallback for safety
}
