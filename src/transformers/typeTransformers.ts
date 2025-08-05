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
import {transpilerContext} from "../context";

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
          let string_key = JSON.stringify(irType);
          let name = transpilerContext.getHoistedLiteral(string_key);
          map.set(name??"_nullName_Report", convertLiteralToInterface(irType.objectLiteral!, name??"_nullName_Report"));
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

  public setDebug(debug: boolean): void {
    this.debug = debug;
  }
}

function convertLiteralToInterface(
  literal: IRLiteral,
  name: string,
): IRInterface {
  // Convert properties first so we can use them for the constructor
  const convertedProperties = literal.properties.map(
    (prop): IRProperties => ({
      name: prop.name,
      type: prop.typeAfter || createDefaultType(), // Handle optional typeAfter
      isOptional: prop.isOptional,
      isReadonly: prop.isReadonly,
      isStatic: prop.isStatic,
    }),
  );

  // Create a constructor that takes all properties as parameters
  const propertyConstructor: IRMethod = {
    name: 'constructor',
    parameters: convertedProperties.map(
      (prop): IRInterfaceParameter => ({
        name: prop.name,
        type: prop.type,
        isOptional: prop.isOptional,
        isRest: false,
      }),
    ),
    returnType: createDefaultType(), // Constructors typically return void or the class type
    isOptional: false,
    isStatic: false,
  };

  // Convert existing constructors
  const existingConstructors = literal.constructors.map(
    (ctor): IRMethod => ({
      name: ctor.name,
      parameters: ctor.parameters.map(
        (param): IRInterfaceParameter => ({
          name: param.name,
          type: param.type,
          isOptional: param.isOptional,
          isRest: param.isRestParameter,
        }),
      ),
      returnType: ctor.returnType || createDefaultType(),
      isOptional: ctor.isOptional,
      isStatic: ctor.isStatic,
    }),
  );

  // Combine property constructor with existing constructors
  const allConstructors = [propertyConstructor, ...existingConstructors];

  return {
    kind: IRDeclKind.Interface,
    name,
    extends: [], // Empty by default, can be populated later if needed
    properties: convertedProperties,
    // Convert methods, handling the return type and parameter differences
    methods: literal.methods.map(
      (method): IRMethod => ({
        name: method.name,
        parameters: method.parameters.map(
          (param): IRInterfaceParameter => ({
            name: param.name,
            type: param.type,
            isOptional: param.isOptional,
            isRest: param.isRestParameter,
          }),
        ),
        returnType: method.returnType || createDefaultType(),
        isOptional: method.isOptional,
        isStatic: method.isStatic,
      }),
    ),
    // Use the combined constructors array
    constructors: allConstructors,
    // Convert get accessors
    getAccessors: literal.getAccessors.map(
      (getter): IRGetAccessor => ({
        name: getter.name,
        type: getter.typeAfter || createDefaultType(),
        isStatic: getter.isStatic,
      }),
    ),
    // Set accessors need parameter conversion
    setAccessors: literal.setAccessors.map(
      (setter): IRSetAccessor => ({
        name: setter.name,
        parameter: {
          name: setter.parameter.name,
          type: setter.parameter.type,
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
