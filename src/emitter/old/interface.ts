import * as fs from "fs";
import { IRInterface } from "../../ir/interface";
import { formatParameterList,returnTypeAliasName } from "../shared/shared";

export function emitInterface(
  irInterface: IRInterface,
  prefix: string,
  filePath: string,
  debug: boolean = false,
) {
  const dartParts: string[] = [];

  dartParts.push("@JS()");
  dartParts.push("@anonymous");

  // Constructor
  if (irInterface.constructors.length > 0) {
    dartParts.push(`class ${irInterface.name}{`);
    dartParts.push(
      `  external factory ${irInterface.name}(${formatParameterList(irInterface.constructors[0].parameters)});`,
    );
    dartParts.push("}");
  } else {
    dartParts.push(`abstract class ${irInterface.name}{}`);
  }

  dartParts.push(
    `extension ${irInterface.name}Extension on ${irInterface.name} {`,
  );
  // Properties
  irInterface.properties.forEach((prop) => {
    if (prop.isReadonly) {
      dartParts.push(`  external ${prop.typeAfter} get ${prop.name};`);
    } else {
      dartParts.push(`  external ${prop.typeAfter} get ${prop.name};`);
      dartParts.push(`  external set ${prop.name}(${prop.typeAfter} value);`);
    }
  });

  // Methods
  irInterface.methods.forEach((method) => {
    dartParts.push(
      `  external ${returnTypeAliasName(method.returnTypeNode)} ${method.name}(${formatParameterList(method.parameters)});`,
    );
  });

  // Getters
  irInterface.getAccessors.forEach((getter) => {
    dartParts.push(`  external ${returnTypeAliasName(getter.typeBefore)} get ${getter.name};`);
  });

  // Setters
  irInterface.setAccessors.forEach((setter) => {
    dartParts.push(`  external set ${setter.name}(${formatParameterList([setter.parameter])});`);
  });

  // Index signatures
  // Note: this is base implementation not precise one
  if (irInterface.indexSignatures.length > 0) {
    dartParts.push("  external dynamic operator [](Object key);");
    dartParts.push("  external void operator []=(Object key, dynamic value);");
  }

  dartParts.push("}\n");

  fs.appendFileSync(filePath, dartParts.join("\n"), "utf-8");
}
