import { IRClass } from "@ir/class";
import { emitType } from "@typeEmitter/emit";
import { formatParameterList, returnTypeAliasName } from "../shared/shared";
import {
  dartName,
  isComputedMember,
  isRenamedBinding,
  jsName,
  memberJsAnnotation,
  qualifiedJsName,
  renamedMemberAnnotation,
  staticClassBindingName,
  unsupportedComputedMemberComment,
} from "../shared/names";

export function emitClass(
  irClass: IRClass,
  prefix: string,
  debug = false,
): string {
  const parts: string[] = [];
  const extensionParts: string[] = [];
  const staticBindingParts: string[] = [];
  const name = dartName(irClass);
  const classJsName = qualifiedJsName(irClass, prefix);
  parts.push(`@JS("${classJsName}")`);
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
    if (isComputedMember(property)) {
      parts.push(unsupportedComputedMemberComment(property));
      continue;
    }
    if (property.isStatic && isRenamedBinding(property)) {
      const bindingName = staticClassBindingName(irClass, property);
      staticBindingParts.push(`@JS("${classJsName}.${jsName(property)}")`);
      staticBindingParts.push(
        `external ${emitType(property.type)} get ${bindingName};`,
      );
      if (!property.isReadonly) {
        staticBindingParts.push(`@JS("${classJsName}.${jsName(property)}")`);
        staticBindingParts.push(
          `external set ${bindingName}(${emitType(property.type)} value);`,
        );
      }
      continue;
    }
    const target = isRenamedBinding(property) ? extensionParts : parts;
    target.push(...renamedMemberAnnotation(property));
    const staticText = property.isStatic ? "static " : "";
    target.push(
      `  external ${staticText}${emitType(property.type)} get ${dartName(property)};`,
    );
    if (!property.isReadonly) {
      target.push(...renamedMemberAnnotation(property));
      target.push(
        `  external ${staticText}set ${dartName(property)}(${emitType(property.type)} value);`,
      );
    }
  }

  for (const method of irClass.methods) {
    if (isComputedMember(method)) {
      parts.push(unsupportedComputedMemberComment(method));
      continue;
    }
    if (method.isStatic && isRenamedBinding(method)) {
      staticBindingParts.push(`@JS("${classJsName}.${jsName(method)}")`);
      staticBindingParts.push(
        `external ${returnTypeAliasName(method.returnType)} ${staticClassBindingName(irClass, method)}(${formatParameterList(method.parameters)});`,
      );
      continue;
    }
    const target = isRenamedBinding(method) ? extensionParts : parts;
    if (isRenamedBinding(method)) target.push(memberJsAnnotation(method));
    const staticText = method.isStatic ? "static " : "";
    target.push(
      `  external ${staticText}${returnTypeAliasName(method.returnType)} ${dartName(method)}(${formatParameterList(method.parameters)});`,
    );
  }

  for (const getter of irClass.getAccessors) {
    if (isComputedMember(getter)) {
      parts.push(unsupportedComputedMemberComment(getter));
      continue;
    }
    if (getter.isStatic && isRenamedBinding(getter)) {
      staticBindingParts.push(`@JS("${classJsName}.${jsName(getter)}")`);
      staticBindingParts.push(
        `external ${returnTypeAliasName(getter.type)} get ${staticClassBindingName(irClass, getter)};`,
      );
      continue;
    }
    const target = isRenamedBinding(getter) ? extensionParts : parts;
    target.push(...renamedMemberAnnotation(getter));
    const staticText = getter.isStatic ? "static " : "";
    target.push(
      `  external ${staticText}${returnTypeAliasName(getter.type)} get ${dartName(getter)};`,
    );
  }

  for (const setter of irClass.setAccessors) {
    if (isComputedMember(setter)) {
      parts.push(unsupportedComputedMemberComment(setter));
      continue;
    }
    if (setter.isStatic && isRenamedBinding(setter)) {
      staticBindingParts.push(`@JS("${classJsName}.${jsName(setter)}")`);
      staticBindingParts.push(
        `external set ${staticClassBindingName(irClass, setter)}(${formatParameterList([setter.parameter])});`,
      );
      continue;
    }
    const target = isRenamedBinding(setter) ? extensionParts : parts;
    target.push(...renamedMemberAnnotation(setter));
    const staticText = setter.isStatic ? "static " : "";
    target.push(
      `  external ${staticText}set ${dartName(setter)}(${formatParameterList([setter.parameter])});`,
    );
  }

  parts.push("}");
  if (extensionParts.length > 0) {
    parts.push(`extension ${name}Extension on ${name} {`);
    parts.push(...extensionParts);
    parts.push("}");
  }
  if (staticBindingParts.length > 0) {
    parts.push(...staticBindingParts);
  }
  return parts.join("\n");
}
