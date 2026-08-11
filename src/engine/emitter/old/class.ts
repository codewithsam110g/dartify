import { IRClass } from "@ir/class";
import { emitType } from "@typeEmitter/emit";
import { formatParameterList, returnTypeAliasName } from "../shared/shared";
import {
  dartName,
  memberJsAnnotation,
  qualifiedJsName,
  renamedMemberAnnotation,
} from "../shared/names";

export function emitClass(
  irClass: IRClass,
  prefix: string,
  debug = false,
): string {
  const parts: string[] = [];
  const name = dartName(irClass);
  parts.push(`@JS("${qualifiedJsName(irClass, prefix)}")`);
  parts.push(`class ${name} {`);

  // Named-constructor lowering is Stage 5. Emitting only the first signature
  // avoids generating duplicate unnamed Dart factories in the meantime.
  const constructor = irClass.constructors[0];
  if (constructor) {
    parts.push(
      `  external factory ${name}(${formatParameterList(constructor.parameters)});`,
    );
  }

  for (const property of irClass.properties) {
    parts.push(...renamedMemberAnnotation(property));
    const staticText = property.isStatic ? "static " : "";
    parts.push(
      `  external ${staticText}${emitType(property.type)} get ${dartName(property)};`,
    );
    if (!property.isReadonly) {
      parts.push(...renamedMemberAnnotation(property));
      parts.push(
        `  external ${staticText}set ${dartName(property)}(${emitType(property.type)} value);`,
      );
    }
  }

  for (const method of irClass.methods) {
    parts.push(memberJsAnnotation(method));
    const staticText = method.isStatic ? "static " : "";
    parts.push(
      `  external ${staticText}${returnTypeAliasName(method.returnType)} ${dartName(method)}(${formatParameterList(method.parameters)});`,
    );
  }

  for (const getter of irClass.getAccessors) {
    parts.push(...renamedMemberAnnotation(getter));
    const staticText = getter.isStatic ? "static " : "";
    parts.push(
      `  external ${staticText}${returnTypeAliasName(getter.type)} get ${dartName(getter)};`,
    );
  }

  for (const setter of irClass.setAccessors) {
    parts.push(...renamedMemberAnnotation(setter));
    const staticText = setter.isStatic ? "static " : "";
    parts.push(
      `  external ${staticText}set ${dartName(setter)}(${formatParameterList([setter.parameter])});`,
    );
  }

  parts.push("}");
  return parts.join("\n");
}
