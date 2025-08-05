/**
 * Pass 4: Declaration Transformations
 * Applies transformations on the parsed declarations using type information
 */

import { IRType } from "../ir/type";
import { IRDeclaration, IRInterface } from "../ir";
import { TranspileException } from "../transpiler";

export interface DeclarationTransformResult {
  declarationMap: Map<string, IRDeclaration>;
  errors: TranspileException[];
}

export class DeclarationTransformer {
  private debug: boolean = false;

  public transform(
    declarationMap: Map<string, IRDeclaration>,
    hoistedMap: Map<string, IRInterface>,
  ): DeclarationTransformResult {
    const errors: TranspileException[] = [];

    try {
      // Apply transformations in order
      this.applyLiteralToInterface(declarationMap, hoistedMap, errors);
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

  private applyLiteralToInterface(
    declarationMap: Map<string, IRDeclaration>,
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
        declarationMap.set(key, irInterface);
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
