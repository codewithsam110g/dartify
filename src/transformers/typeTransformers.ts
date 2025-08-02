/**
 * Pass 2: Type Transformations
 * Applies type hoisting and other transformations on the collected IRTypes
 */

import {
  IRDeclKind,
  IRGetAccessor,
  IRIndexSignatures,
  IRInterface,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "../ir";
import { IRLiteral } from "../ir/literal";
import { IRParameter as IRInterfaceParameter } from "../ir";
import { IRType, TypeKind } from "../ir/type";
import { TranspileException } from "../transpiler";

export interface TypeTransformResult {
  hoistedMap: Map<string, IRInterface>;
  errors: TranspileException[];
}

export class TypeTransformer {
  private debug: boolean = false;

  public transform(typeMap: Map<string, IRType>): TypeTransformResult {
    const errors: TranspileException[] = [];
    let hoistedMap: Map<string, IRInterface> = new Map();
    try {
      // Apply transformations in order
      let cleanedTypeMap = new Map(
        [...typeMap].filter(
          ([_, value]) => value.kind === TypeKind.TypeLiteral,
        ),
      );
      hoistedMap = this.applyTypeHoisting(cleanedTypeMap, errors);
    } catch (error) {
      const transpileError =
        error instanceof TranspileException
          ? error
          : new TranspileException(
              `Type transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              "TYPE_TRANSFORM_ERROR",
            );
      errors.push(transpileError);
    }

    return { hoistedMap: hoistedMap, errors };
  }

  /**
   * Type Hoisting: Move commonly used types to the top level
   * This helps with Dart code generation and reduces redundancy
   */
  private applyTypeHoisting(
    typeMap: Map<string, IRType>,
    errors: TranspileException[],
  ): Map<string, IRInterface> {
    let map: Map<string, IRInterface> = new Map();
    try {
      for (const [key, irType] of typeMap) {
        if (irType.kind == TypeKind.TypeLiteral) {
          const name = "_hoisted" + this.generateHoistedTypeName(irType);
          map.set(key, convertLiteralToInterface(irType.objectLiteral!, name));
        }
      }
    } catch (error) {
      errors.push(
        new TranspileException(
          `Type hoisting failed: ${error instanceof Error ? error.message : String(error)}`,
          "TYPE_HOISTING_ERROR",
        ),
      );
    }
    return map;
  }

  private getTypeSignature(irType: IRType): string {
    // Generate a unique signature for the type
    // This is a simplified version - you might want to make it more sophisticated
    return JSON.stringify({
      kind: irType.kind,
      name: irType.name,
      isNullable: irType.isNullable,
      // Add other relevant properties for signature
    });
  }

  private generateHoistedTypeName(irType: IRType): string {
    // Generate a meaningful name for hoisted types
    const kindName = irType.kind.toString();
    const hash = this.simpleHash(this.getTypeSignature(irType));
    return `${kindName}_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  public setDebug(debug: boolean): void {
    this.debug = debug;
  }
}

function convertLiteralToInterface(
  literal: IRLiteral,
  name: string,
): IRInterface {
  return {
    kind: IRDeclKind.Interface,
    name,
    extends: [], // Empty by default, can be populated later if needed

    // Convert properties, handling the type differences
    properties: literal.properties.map(
      (prop): IRProperties => ({
        name: prop.name,
        typeBefore: undefined, // IRLiteral doesn't have typeBefore
        typeAfter: prop.typeAfter || createDefaultType(), // Handle optional typeAfter
        isOptional: prop.isOptional,
        isReadonly: prop.isReadonly,
        isStatic: prop.isStatic,
      }),
    ),

    // Convert methods, handling the return type and parameter differences
    methods: literal.methods.map(
      (method): IRMethod => ({
        name: method.name,
        parameters: method.parameters.map(
          (param): IRInterfaceParameter => ({
            name: param.name,
            typeBefore: undefined,
            typeAfter: param.type,
            isOptional: param.isOptional,
            isRest: param.isRestParameter,
          }),
        ),
        returnType: method.returnType || createDefaultType(),
        returnTypeNode: undefined,
        isOptional: method.isOptional,
        isStatic: method.isStatic,
      }),
    ),

    // Constructors need parameter conversion as well
    constructors: literal.constructors.map(
      (ctor): IRMethod => ({
        name: ctor.name,
        parameters: ctor.parameters.map(
          (param): IRInterfaceParameter => ({
            name: param.name,
            typeBefore: undefined,
            typeAfter: param.type,
            isOptional: param.isOptional,
            isRest: param.isRestParameter,
          }),
        ),
        returnType: ctor.returnType || createDefaultType(),
        returnTypeNode: undefined,
        isOptional: ctor.isOptional,
        isStatic: ctor.isStatic,
      }),
    ),

    // Convert get accessors
    getAccessors: literal.getAccessors.map(
      (getter): IRGetAccessor => ({
        name: getter.name,
        typeBefore: undefined, // IRLiteral doesn't have typeBefore
        typeAfter: getter.typeAfter || createDefaultType(),
        isStatic: getter.isStatic,
      }),
    ),

    // Set accessors need parameter conversion
    setAccessors: literal.setAccessors.map(
      (setter): IRSetAccessor => ({
        name: setter.name,
        parameter: {
          name: setter.parameter.name,
          typeBefore: undefined,
          typeAfter: setter.parameter.type,
          isOptional: setter.parameter.isOptional,
          isRest: setter.parameter.isRestParameter,
        },
        isStatic: setter.isStatic,
      }),
    ),

    // Convert index signatures, handling optional types
    indexSignatures: literal.indexSignatures.map(
      (indexSig): IRIndexSignatures => ({
        keyType: indexSig.keyType || createDefaultType(),
        valueType: indexSig.valueType || createDefaultType(),
        isReadonly: indexSig.isReadonly,
      }),
    ),
  };
}

// Helper function to create a default IRType when needed
function createDefaultType(): IRType {
  // Return a default IRType - you may want to customize this based on your needs
  // For example, this could represent an 'any' type or 'unknown' type
  return {
    kind: TypeKind.Unknown,
    name: TypeKind.Unknown,
    isNullable: false,
  };
}
