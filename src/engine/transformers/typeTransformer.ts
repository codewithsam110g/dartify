import { TranspileException } from "@/transpiler";
import { transpilerContext } from "@/context";
import { Logger, LogLevel } from "@/log";
import { TypeVisitor } from "./typeVisitor";

import {
  IRDeclaration,
  IRParameter,
} from "@ir/index";

import {
  IRType,
  TypeKind,
} from "@ir/type"

import { IRLiteral } from "@ir/literal";

import {
  IRDeclKind,
  IRGetAccessor,
  IRIndexSignatures,
  IRInterface,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "@ir/index";

export interface TypeTransformerResult {
  transformedMap: Map<string, IRDeclaration[]>;
  errors: TranspileException[];
}

export class TypeTransformer {
  public transform(
    declarationMap: Map<string, IRDeclaration[]>,
  ): TypeTransformerResult {
    const errors: TranspileException[] = [];

    // --- Logging Setup ---
    if (transpilerContext.getIsLogging()) {
      let logger = new Logger(
        "typeTransformer.ir",
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
        "Pass: 2 -> Type Transformer",
        "Writing all the Type Transformations to Log",
      );
    }

    // --- Step 1: Initialize the Recursive Visitor ---
    // The visitor holds the state for deduplication and the list of hoisted types
    const visitor = new TypeVisitor();

    try {
      // --- Step 2: Visit Every Declaration ---
      // We walk through every declaration in the map. The visitor mutates them *in place*,
      // converting inline object literals into TypeReferences (e.g., AnonInterface$1).
      for (const [key, declarations] of declarationMap) {
        for (const decl of declarations) {
          try {
            visitor.visitDeclaration(decl);
          } catch (innerError) {
            // Capture specific declaration errors without killing the whole process
            errors.push(
              new TranspileException(
                `Error visiting declaration '${key}': ${innerError}`,
                "VISITOR_ERROR"
              )
            );
          }
        }
      }

      // --- Step 3: Collect and Merge Hoisted Interfaces ---
      // The visitor has been collecting every { object: literal } it found.
      // We now pull them out and add them to our declaration map as top-level interfaces.
      const hoistedLiterals = visitor.getHoistedDeclarations();

      for (const [name, literal] of hoistedLiterals) {
        // Check for collisions (though the Unique ID system should prevent this)
        if (declarationMap.has(name)) {
          errors.push(
            new TranspileException(
              `Hoisting Conflict: Generated name '${name}' collides with an existing export.`,
              "HOIST_COLLISION"
            )
          );
          continue;
        }

        // CONVERSION STEP:
        // You mentioned you will handle the specific conversions.
        // This is where you convert the raw `IRTypeLiteral` (literal) into a full `IRInterface`.
        // For now, I am wrapping it in a basic structure to fit the Map signature.
        const newInterface: IRInterface = convertLiteralToInterface(literal, name);

        // Register the new hoisted interface as a top-level declaration
        declarationMap.set(name, [newInterface]);

        // Log the creation
        if (transpilerContext.getIsLogging()) {
          new Logger("typeTransformer.ir", "./logs", LogLevel.DEBUG).debug(
            `Hoisted: ${name}`
          );
        }
      }

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

    // Return the mutated map (now containing both original decls and new hoisted interfaces)
    return { transformedMap: declarationMap, errors };
  }
}



function convertLiteralToInterface(
  literal: IRLiteral,
  name: string,
): IRInterface {
  // Convert properties first so we can use them for the constructor
  const convertedProperties = literal.properties.map(
    (prop): IRProperties => (
      {
      name: prop.name,
      type: prop.type,
      isOptional: prop.isOptional,
      isReadonly: prop.isReadonly,
      isStatic: prop.isStatic,
    }),
  );

  // Create a constructor that takes all properties as parameters
  const propertyConstructor: IRMethod = {
    name: "constructor",
    parameters: convertedProperties.map(
      (prop): IRParameter => ({
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
        (param): IRParameter => ({
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
          (param): IRParameter => ({
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
        type: getter.type || createDefaultType(),
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