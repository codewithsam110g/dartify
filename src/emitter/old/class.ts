import * as fs from "fs";

import { IRClass } from "../../ir/class";
import { IRMethod } from "../../ir/interface";
import { stripQuotes } from "../../utils/utils";

export function emitClass(
  irClass: IRClass,
  prefix: string,
  filePath: string,
  debug: boolean = false,
) {
  let dartParts: string[] = [];
  const internalVal = stripQuotes(`${prefix}${irClass.name}`);
  const jsAnnotation = `@JS("${internalVal}")`;
  dartParts.push(`${jsAnnotation}\nclass ${irClass.name} {`);

  // Constructors
  let constructorCount = 0;
  for (let constructor of irClass.constructors) {
    let constructorName = irClass.name + "_".repeat(constructorCount);
    dartParts.push(
      `  external factory ${constructorName}(${constructor.parameters});`,
    );
  }
  // Properties
  //
  irClass.properties.forEach((prop) => {
    if (prop.isReadonly) {
      if (prop.isStatic) {
        dartParts.push(`  external static ${prop.typeAfter} get ${prop.name};`);
      } else {
        dartParts.push(`  external ${prop.typeAfter} get ${prop.name};`);
      }
    } else {
      if (prop.isStatic) {
        dartParts.push(`  external static ${prop.typeAfter} get ${prop.name};`);
        dartParts.push(
          `  external static set ${prop.name}(${prop.typeAfter} value);`,
        );
      } else {
        dartParts.push(`  external ${prop.typeAfter} get ${prop.name};`);
        dartParts.push(`  external set ${prop.name}(${prop.typeAfter} value);`);
      }
    }
  });

  let overloadMethods = getOverloadFuncs(irClass.methods);

  for (let [func_name, func_arr] of overloadMethods.entries()) {
    let count = 0;
    for (let func of func_arr) {
      if (func_arr.length == 1) {
        if (func.isStatic) {
          dartParts.push(
            `  external static ${func.returnType} ${func.name}(${func.parameters});`,
          );
        } else {
          dartParts.push(
            `  external ${func.returnType} ${func.name}(${func.parameters});`,
          );
        }
      } else {
        count += 1;
        let name = func_name + "_" + count;
        // this.getParamTypeSuffix(func.functionDecl.getParameters());
        if (func.isStatic) {
          dartParts.push(`  @JS("${func_name}")`);
          dartParts.push(
            `  external static ${func.returnType} ${name}(${func.parameters});`,
          );
        } else {
          dartParts.push(`  @JS("${func_name}")`);
          dartParts.push(
            `  external ${func.returnType} ${name}(${func.parameters});`,
          );
        }
      }
    }
  }

  // Methods
  // irClass.methods.forEach((method) => {
  //   dartParts.push(
  //     `  external ${method.returnType} ${method.name}(${method.parameters});`,
  //   );
  // });

  // Getters
  irClass.getAccessors.forEach((getter) => {
    if (getter.isStatic) {
      dartParts.push(
        `  external static ${getter.typeAfter} get ${getter.name};`,
      );
    } else {
      dartParts.push(`  external ${getter.typeAfter} get ${getter.name};`);
    }
  });

  // Setters
  irClass.setAccessors.forEach((setter) => {
    if (setter.isStatic) {
      dartParts.push(
        `  external static set ${setter.name}(${setter.parameter});`,
      );
    } else {
      dartParts.push(`  external set ${setter.name}(${setter.parameter});`);
    }
  });
  dartParts.push("}\n");
  fs.appendFileSync(filePath, dartParts.join("\n"), "utf-8");
}

function getOverloadFuncs(funcs: IRMethod[]): Map<String, IRMethod[]> {
  const map = new Map<string, IRMethod[]>();
  for (const func of funcs) {
    const list = map.get(func.name) ?? [];
    list.push(func);
    map.set(func.name, list);
  }
  return map;
}
