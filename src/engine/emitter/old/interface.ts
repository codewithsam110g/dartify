import { IRInterface } from "@ir/interface";
import { emitType } from "@typeEmitter/emit";
import {
  formatNamedParameters,
  formatParameterList,
  returnTypeAliasName,
} from "../shared/shared";
import {
  dartName,
  memberJsAnnotation,
  qualifiedJsName,
  renamedMemberAnnotation,
} from "../shared/names";

export function emitInterface(
  irInterface: IRInterface,
  prefix: string,
  debug = false,
  hasRuntimeBinding = false,
): string {
  const parts: string[] = [];
  const name = dartName(irInterface);

  if (hasRuntimeBinding) {
    parts.push(`@JS("${qualifiedJsName(irInterface, prefix)}")`);
  } else {
    parts.push("@JS()");
    parts.push("@anonymous");
  }
  const classKeyword =
    !hasRuntimeBinding && irInterface.constructSignatures.length === 0
      ? "abstract class"
      : "class";
  const staticMemberCount =
    irInterface.properties.filter((value) => value.isStatic).length +
    irInterface.methods.filter((value) => value.isStatic).length +
    irInterface.getAccessors.filter((value) => value.isStatic).length +
    irInterface.setAccessors.filter((value) => value.isStatic).length;
  const emptyAbstract =
    classKeyword === "abstract class" && staticMemberCount === 0;
  parts.push(
    emptyAbstract ? `${classKeyword} ${name}{}` : `${classKeyword} ${name}{`,
  );

  // Construct-signature overload lowering is deliberately deferred to S5.
  const constructor = irInterface.constructSignatures[0];
  if (constructor) {
    parts.push(
      `  external factory ${name}(${formatNamedParameters(constructor.parameters)});`,
    );
  }

  emitProperties(
    parts,
    irInterface.properties.filter((property) => property.isStatic),
    true,
  );
  emitMethods(
    parts,
    irInterface.methods.filter((method) => method.isStatic),
    true,
  );
  for (const getter of irInterface.getAccessors.filter(
    (value) => value.isStatic,
  )) {
    parts.push(...renamedMemberAnnotation(getter));
    parts.push(
      `  external static ${returnTypeAliasName(getter.type)} get ${dartName(getter)};`,
    );
  }
  for (const setter of irInterface.setAccessors.filter(
    (value) => value.isStatic,
  )) {
    parts.push(...renamedMemberAnnotation(setter));
    parts.push(
      `  external static set ${dartName(setter)}(${formatParameterList([setter.parameter])});`,
    );
  }
  if (!emptyAbstract) parts.push("}");

  parts.push(`extension ${name}Extension on ${name} {`);
  emitProperties(
    parts,
    irInterface.properties.filter((property) => !property.isStatic),
    false,
  );
  emitMethods(
    parts,
    irInterface.methods.filter((method) => !method.isStatic),
    false,
  );
  for (const getter of irInterface.getAccessors.filter(
    (value) => !value.isStatic,
  )) {
    parts.push(...renamedMemberAnnotation(getter));
    parts.push(
      `  external ${returnTypeAliasName(getter.type)} get ${dartName(getter)};`,
    );
  }
  for (const setter of irInterface.setAccessors.filter(
    (value) => !value.isStatic,
  )) {
    parts.push(...renamedMemberAnnotation(setter));
    parts.push(
      `  external set ${dartName(setter)}(${formatParameterList([setter.parameter])});`,
    );
  }

  if (irInterface.indexSignatures.length > 0) {
    parts.push("  external dynamic operator [](Object key);");
    parts.push("  external void operator []=(Object key, dynamic value);");
  }

  parts.push("}");
  return parts.join("\n");
}

function emitProperties(
  parts: string[],
  properties: IRInterface["properties"],
  isStatic: boolean,
): void {
  const staticText = isStatic ? "static " : "";
  for (const property of properties) {
    parts.push(...renamedMemberAnnotation(property));
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
}

function emitMethods(
  parts: string[],
  methods: IRInterface["methods"],
  isStatic: boolean,
): void {
  const staticText = isStatic ? "static " : "";
  for (const method of methods) {
    parts.push(memberJsAnnotation(method));
    parts.push(
      `  external ${staticText}${returnTypeAliasName(method.returnType)} ${dartName(method)}(${formatParameterList(method.parameters)});`,
    );
  }
}
