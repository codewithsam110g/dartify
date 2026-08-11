import { IREnum } from "@ir/enum";
import {
  dartName,
  qualifiedJsName,
  renamedMemberAnnotation,
} from "../shared/names";

export function emitEnum(
  irEnum: IREnum,
  prefix: string,
  debug = false,
): string {
  const internalVal = qualifiedJsName(irEnum, prefix);
  const jsAnnotation = `@JS("${internalVal}")`;

  // Generate Dart enum
  const members = irEnum.members
    .map((member) => {
      const value =
        member.initializer.kind === "implicit"
          ? undefined
          : member.initializer.kind === "computed"
            ? member.initializer.computedValue
            : member.initializer.value;
      return [
        ...renamedMemberAnnotation(member),
        `  external static ${inferDartType(value)} get ${dartName(member)};`,
      ].join("\n");
    })
    .join("\n");

  const name = dartName(irEnum);
  return `${jsAnnotation}\nclass ${name}{}\n${jsAnnotation}\nextension ${name}Enum on ${name}{\n${members}\n}`;
}

function inferDartType(value: string | number | undefined): string {
  if (typeof value === "number")
    return Number.isInteger(value) ? "int" : "double";
  if (typeof value === "string") return "String";
  return "dynamic"; // fallback for safety
}
