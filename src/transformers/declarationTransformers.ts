/**
 * Pass 4: Declaration Transformations
 * Applies transformations on the parsed declarations using type information
 */

import { IRType } from "../ir/type";
import {
  deepCloneIRDeclaration,
  IRClass,
  IRDeclaration,
  IRDeclKind,
  IRFunction,
  IRInterface,
  IRMethod,
} from "../ir";
import { TranspileException } from "../transpiler";

export interface DeclarationTransformResult {
  declarationMap: Map<string, IRDeclaration[]>;
  errors: TranspileException[];
}

export class DeclarationTransformer {
  private debug: boolean = false;

  public transform(
    declarationMap: Map<string, IRDeclaration[]>,
    hoistedMap: Map<string, IRInterface>,
  ): DeclarationTransformResult {
    const errors: TranspileException[] = [];

    try {
      // Apply transformations in order
      this.applyLiteralToInterface(declarationMap, hoistedMap, errors);
      declarationMap = this.applyFunctionOverloads(declarationMap);
      declarationMap = this.applyClassMethodLikeOverloads(declarationMap);
      declarationMap = this.applyInterfaceMethodLikeOverloads(declarationMap);
    } catch (error) {
      const transpileError =
        error instanceof TranspileException
          ? error
          : new TranspileException(
              `Declaration transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              "DECLARATION_TRANSFORM_ERROR",
            );
      errors.push(transpileError);
    }

    return { declarationMap, errors };
  }

  private applyFunctionOverloads(
    declarationMap: Map<string, IRDeclaration[]>,
  ): Map<string, IRDeclaration[]> {
    let newDeclMap = new Map<string, IRDeclaration[]>();
    for (let [k, v] of declarationMap) {
      if (v.length == 1) {
        newDeclMap.set(k, [deepCloneIRDeclaration(v[0])]);
      } else if (v.length > 1) {
        if (v.every((e) => e.kind == IRDeclKind.Function)) {
          const clonedDecls = v.map(deepCloneIRDeclaration);
          let count = 1;
          clonedDecls.map((e) => {
            e.name = e.name + "_" + (count++).toString();
            return e;
          });
          newDeclMap.set(k, clonedDecls);
        }
      }
    }
    return newDeclMap;
  }

  private applyClassMethodLikeOverloads(
    declarationMap: Map<string, IRDeclaration[]>,
  ): Map<string, IRDeclaration[]> {
    for (let [k, v] of declarationMap) {
      if (v.length == 1 && v[0].kind == IRDeclKind.Class) {
        //Methods
        let irClass = v[0] as IRClass;
        let methodMap: Map<string, IRMethod[]> = new Map();
        for (let method of irClass.methods) {
          if (methodMap.has(method.name)) {
            methodMap.get(method.name)!.push(method);
          } else {
            methodMap.set(method.name, [method]);
          }
        }
        for (let [methodName, methods] of methodMap) {
          if (methods.length > 1) {
            let count = 1;
            for (let method of methods) {
              method.name = methodName + "_" + (count++);
            }
          }
        }
        irClass.methods = [...methodMap.values()].flat();
      }
    }
    return declarationMap;
  }

  private applyInterfaceMethodLikeOverloads(
    declarationMap: Map<string, IRDeclaration[]>,
  ): Map<string, IRDeclaration[]> {
    for (let [k, v] of declarationMap) {
      if (v.length == 1 && v[0].kind == IRDeclKind.Interface) {
        //Methods
        let irClass = v[0] as IRClass;
        let methodMap: Map<string, IRMethod[]> = new Map();
        for (let method of irClass.methods) {
          if (methodMap.has(method.name)) {
            methodMap.get(method.name)!.push(method);
          } else {
            methodMap.set(method.name, [method]);
          }
        }
        for (let [methodName, methods] of methodMap) {
          if (methods.length > 1) {
            let count = 1;
            for (let method of methods) {
              method.name = methodName + "_" + (count++);
            }
          }
        }
        irClass.methods = [...methodMap.values()].flat();
      }
    }
    return declarationMap;
  }
  
  private applyLiteralToInterface(
    declarationMap: Map<string, IRDeclaration[]>,
    hoistedMap: Map<string, IRInterface>,
    errors: TranspileException[],
  ) {
    // Add all hoisted interfaces to the declaration map
    for (const [key, irInterface] of hoistedMap.entries()) {
      try {
        // Check if key already exists to avoid conflicts
        if (declarationMap.has(key)) {
          errors.push(
            new TranspileException(
              `Declaration conflict: Interface '${key}' already exists in declaration map and the value:${JSON.stringify(declarationMap.get(key))}`,
            ),
          );
          continue;
        }

        // Add the interface to the declaration map
        // Since IRInterface extends IRDeclaration, this is valid
        declarationMap.set(key, [irInterface]);
      } catch (error) {
        errors.push(
          new TranspileException(
            `Failed to apply interface '${key}' to declaration map: ${error}`,
          ),
        );
      }
    }
  }
  public setDebug(debug: boolean): void {
    this.debug = debug;
  }
}
