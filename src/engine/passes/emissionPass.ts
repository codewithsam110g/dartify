/**
 * Pass 5: Code Emission
 * Generates final Dart code from the transformed declarations
 */

import {
  IRClass,
  IRDeclaration,
  IREnum,
  IRFunction,
  IRInterface,
  IRTypeAlias,
  IRVariable,
} from "@ir/index";
import { TranspileException } from "@/transpiler";
import * as emitter from "@emitter/old/index";

export interface EmissionPassResult {
  content: string;
  errors: TranspileException[];
}

export class EmissionPassProcessor {
  private debug: boolean = false;

  public processDeclarations(
    declarationMap: Map<string, IRDeclaration[]>,
    header: string,
    debug: boolean = false,
  ): EmissionPassResult {
    this.debug = debug;
    const outputStrings: string[] = [];
    const errors: TranspileException[] = [];

    try {
      // Add header
      outputStrings.push(header);


      // Process declarations in dependency order (already sorted from Pass 4)
      for (const [key, declaration] of declarationMap) {
        for (let decl of declaration) {
          try {
            const emittedCode = this.emitDeclaration(decl, key);
            if (emittedCode) {
              outputStrings.push(emittedCode);
            }
          } catch (error) {
            const transpileError =
              error instanceof TranspileException
                ? error
                : new TranspileException(
                  `Error emitting declaration ${key}: ${error instanceof Error ? error.message : String(error)}`,
                  "EMISSION_ERROR",
                );
            errors.push(transpileError);
          }
        }
      }
    } catch (error) {
      const transpileError =
        error instanceof TranspileException
          ? error
          : new TranspileException(
            `Code emission failed: ${error instanceof Error ? error.message : String(error)}`,
            "EMISSION_PASS_ERROR",
          );
      errors.push(transpileError);
    }

    return {
      content: outputStrings.join("\n"),
      errors,
    };
  }



  private emitDeclaration(
    declaration: IRDeclaration,
    key: string,
  ): string {
    // Extract module prefix for emission
    const modulePrefix = this.extractModulePrefix(key);

    switch (declaration.kind) {
      case "interface":
        return this.emitInterface(declaration, modulePrefix);

      case "typeAlias":
        return this.emitTypeAlias(declaration, modulePrefix);

      case "class":
        return this.emitClass(declaration, modulePrefix);

      case "function":
        return this.emitFunction(declaration, modulePrefix);

      case "variable":
        return this.emitVariable(declaration, modulePrefix);

      case "enum":
        return this.emitEnum(declaration, modulePrefix);

      default:
        throw new TranspileException(
          `Unsupported declaration kind for emission: ${declaration.kind}`,
          "UNSUPPORTED_EMISSION_KIND",
        );
    }
  }

  private emitInterface(
    declaration: IRDeclaration,
    modulePrefix: string,
  ): string {
    try {
      return emitter.emitInterface(
        declaration as IRInterface,
        modulePrefix,
        this.debug,
      );
    } catch (error) {
      throw new TranspileException(
        `Failed to emit interface: ${error instanceof Error ? error.message : String(error)}`,
        "INTERFACE_EMISSION_ERROR",
      );
    }
  }

  private emitTypeAlias(
    declaration: IRDeclaration,
    modulePrefix: string,
  ): string {
    try {
      return emitter.emitTypeAlias(
        declaration as IRTypeAlias,
        modulePrefix,
        this.debug,
      );
    } catch (error) {
      throw new TranspileException(
        `Failed to emit type alias: ${error instanceof Error ? error.message : String(error)}`,
        "TYPE_ALIAS_EMISSION_ERROR",
      );
    }
  }

  private emitClass(declaration: IRDeclaration, modulePrefix: string): string {
    try {
      return emitter.emitClass(
        declaration as IRClass,
        modulePrefix,
        this.debug,
      );
    } catch (error) {
      throw new TranspileException(
        `Failed to emit class: ${error instanceof Error ? error.message : String(error)}`,
        "CLASS_EMISSION_ERROR",
      );
    }
  }

  private emitFunction(
    declaration: IRDeclaration,
    modulePrefix: string,
  ): string {
    try {
      return emitter.emitFunction(
        declaration as IRFunction,
        modulePrefix,
        this.debug,
      );
    } catch (error) {
      throw new TranspileException(
        `Failed to emit function: ${error instanceof Error ? error.message : String(error)}`,
        "FUNCTION_EMISSION_ERROR",
      );
    }
  }

  private emitVariable(
    declaration: IRDeclaration,
    modulePrefix: string,
  ): string {
    try {
      return emitter.emitVariable(
        declaration as IRVariable,
        modulePrefix,
        this.debug,
      );
    } catch (error) {
      throw new TranspileException(
        `Failed to emit variable: ${error instanceof Error ? error.message : String(error)}`,
        "VARIABLE_EMISSION_ERROR",
      );
    }
  }

  private emitEnum(declaration: IRDeclaration, modulePrefix: string): string {
    try {
      return emitter.emitEnum(declaration as IREnum, modulePrefix, this.debug);
    } catch (error) {
      throw new TranspileException(
        `Failed to emit enum: ${error instanceof Error ? error.message : String(error)}`,
        "ENUM_EMISSION_ERROR",
      );
    }
  }

  private extractModulePrefix(key: string): string {
    const lastDotIndex = key.lastIndexOf(".");
    if (lastDotIndex === -1) {
      return "";
    }
    return key.substring(0, lastDotIndex + 1);
  }

  public setDebug(debug: boolean): void {
    this.debug = debug;
  }
}
