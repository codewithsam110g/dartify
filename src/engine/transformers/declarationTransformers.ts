/**
 * Pass 4: Declaration Transformations
 * Applies transformations on the parsed declarations using type information
 */

import {
  deepCloneIRDeclaration,
  IRClass,
  IRDeclaration,
  IRDeclKind,
  IRFunction,
  IRInterface,
  IRMethod,
} from "@ir/index";
import { TranspileException } from "@/transpiler";
import { transpilerContext } from "@/context";
import { Logger, LogLevel } from "@/log";

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

    if (transpilerContext.getIsLogging()) {
      let logger = new Logger(
        "declarationTransformer.ir",
        "./logs",
        LogLevel.DEBUG,
      );
      const line = "═".repeat(
        transpilerContext.getCurrentFileName().length + 22,
      );
      logger.info(
        `\n\n${line}\n  📄 Current File: ${transpilerContext.getCurrentFileName()}\n${line}\n`,
      );
      logger.log(
        LogLevel.DEBUG,
        "Pass: 2 -> DeclarationTransformer",
        "Writing all the Declaration Transformations to Log",
      );
    }

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
    if (transpilerContext.getIsLogging()) {
      if (errors.length > 0) {
        Logger.stdout.warn(
          "Got some errors from declaration transformer, writing them to log",
        );
        let logger = new Logger(
          "declarationTransformer.ir",
          "./logs",
          LogLevel.DEBUG,
        );
        for (let err of errors) {
          logger.warn(err.message);
        }
      }
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

          if (transpilerContext.getIsLogging()) {
            let logger = new Logger(
              "declarationTransformer.ir",
              "./logs",
              LogLevel.DEBUG,
            );
            logger.debug("Before: " + `${k}: ${JSON.stringify(v)}`);
            logger.debug("After: " + `${k}: ${JSON.stringify(clonedDecls)}`);
          }

          newDeclMap.set(k, clonedDecls);
        } else {
          newDeclMap.set(k, v);
        }
      }
    }
    return newDeclMap;
  }

  private applyClassMethodLikeOverloads(
    declarationMap: Map<string, IRDeclaration[]>,
  ): Map<string, IRDeclaration[]> {
    const newDeclarationMap = new Map<string, IRDeclaration[]>();

    for (let [k, v] of declarationMap) {
      if (v.length == 1 && v[0].kind == IRDeclKind.Class) {
        const irClass = v[0] as IRClass;
        const methodMap: Map<string, IRMethod[]> = new Map();

        for (let method of irClass.methods) {
          if (methodMap.has(method.name)) {
            methodMap.get(method.name)!.push(method);
          } else {
            methodMap.set(method.name, [method]);
          }
        }

        let hasOverloads = false;
        for (let methods of methodMap.values()) {
          if (methods.length > 1) {
            hasOverloads = true;
            break;
          }
        }

        if (hasOverloads) {
          const newMethods: IRMethod[] = [];
          for (let [methodName, methods] of methodMap) {
            if (methods.length > 1) {
              let count = 1;
              for (let method of methods) {
                const newMethod = {
                  ...method,
                  name: methodName + "_" + count++,
                };
                newMethods.push(newMethod);
              }
            } else {
              newMethods.push(...methods);
            }
          }

          const newClass = { ...irClass, methods: newMethods };
          newDeclarationMap.set(k, [newClass]);

          if (transpilerContext.getIsLogging()) {
            let logger = new Logger(
              "declarationTransformer.ir",
              "./logs",
              LogLevel.DEBUG,
            );
            logger.debug("Before: " + `${k}: ${JSON.stringify(v[0])}`);
            logger.debug("After: " + `${k}: ${JSON.stringify(newClass)}`);
          }
        } else {
          newDeclarationMap.set(k, v);
        }
      } else {
        newDeclarationMap.set(k, v);
      }
    }

    return newDeclarationMap;
  }

  private applyInterfaceMethodLikeOverloads(
    declarationMap: Map<string, IRDeclaration[]>,
  ): Map<string, IRDeclaration[]> {
    const newDeclarationMap = new Map<string, IRDeclaration[]>();

    for (let [k, v] of declarationMap) {
      if (v.length == 1 && v[0].kind == IRDeclKind.Interface) {
        const irInterface = v[0] as IRInterface; // Fixed: should be IRInterface, not IRClass
        const methodMap: Map<string, IRMethod[]> = new Map();

        for (let method of irInterface.methods) {
          if (methodMap.has(method.name)) {
            methodMap.get(method.name)!.push(method);
          } else {
            methodMap.set(method.name, [method]);
          }
        }

        let hasOverloads = false;
        for (let methods of methodMap.values()) {
          if (methods.length > 1) {
            hasOverloads = true;
            break;
          }
        }

        if (hasOverloads) {
          const newMethods: IRMethod[] = [];
          for (let [methodName, methods] of methodMap) {
            if (methods.length > 1) {
              let count = 1;
              for (let method of methods) {
                const newMethod = {
                  ...method,
                  name: methodName + "_" + count++,
                };
                newMethods.push(newMethod);
              }
            } else {
              newMethods.push(...methods);
            }
          }

          const newInterface = { ...irInterface, methods: newMethods };
          newDeclarationMap.set(k, [newInterface]);
          if (transpilerContext.getIsLogging()) {
            let logger = new Logger(
              "declarationTransformer.ir",
              "./logs",
              LogLevel.DEBUG,
            );
            logger.debug("Before: " + `${k}: ${JSON.stringify(v[0])}`);
            logger.debug("After: " + `${k}: ${JSON.stringify(newInterface)}`);
          }
        } else {
          newDeclarationMap.set(k, v);
        }
      } else {
        newDeclarationMap.set(k, v);
      }
    }

    return newDeclarationMap;
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
