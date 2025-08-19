// in tests/emitter.test.ts

import { describe, it, expect } from "vitest";
import { emitType } from "../../src/engine/emitter/old/type/emit"; // Using the correct path
import { IRType, TypeKind, IRParameter } from "../../src/ir/type"; // Using the correct path

describe("Type Emitter", () => {
  // --- Primitives ---
  describe("Primitives", () => {
    it("should emit a simple primitive type", () => {
      const irType: IRType = {
        kind: TypeKind.Number,
        name: "number",
        isNullable: false,
      };
      const dartType = emitType(irType);
      expect(dartType).toBe("num"); // Assumes your emitter correctly maps 'number' to 'num'
    });

    it("should emit a nullable primitive type", () => {
      const irType: IRType = {
        kind: TypeKind.String,
        name: "string",
        isNullable: true,
      };
      const dartType = emitType(irType);
      expect(dartType).toBe("String?");
    });

    it('should emit "dynamic" for "any" type', () => {
      const irType: IRType = {
        kind: TypeKind.Any,
        name: "any",
        isNullable: false,
      };
      const dartType = emitType(irType);
      expect(dartType).toBe("dynamic");
    });
  });

  // --- Functions ---
  describe("Functions", () => {
    it("should emit a simple function type", () => {
      const irType: IRType = {
        kind: TypeKind.Function,
        name: "function",
        isNullable: false,
        parameters: [
          {
            name: "a",
            type: { kind: TypeKind.String, name: "string", isNullable: false },
            isOptional: false,
            isRestParameter: false,
          },
        ],
        returnType: { kind: TypeKind.Void, name: "void", isNullable: false },
      };
      const dartType = emitType(irType);
      expect(dartType).toBe("void Function(String)");
    });

    it("should emit an optional function parameter", () => {
      const irType: IRType = {
        kind: TypeKind.Function,
        name: "function",
        isNullable: false,
        parameters: [
          {
            name: "a",
            type: { kind: TypeKind.String, name: "string", isNullable: false },
            isOptional: true,
            isRestParameter: false,
          },
        ],
        returnType: { kind: TypeKind.Void, name: "void", isNullable: false },
      };
      const dartType = emitType(irType);
      expect(dartType).toBe("void Function([String])");
    });

    it("should emit multiple parameters", () => {
      const irType: IRType = {
        kind: TypeKind.Function,
        name: "function",
        isNullable: false,
        parameters: [
          {
            name: "a",
            type: { kind: TypeKind.Number, name: "number", isNullable: false },
            isOptional: false,
            isRestParameter: false,
          },
          {
            name: "b",
            type: { kind: TypeKind.Boolean, name: "boolean", isNullable: true },
            isOptional: false,
            isRestParameter: false,
          },
        ],
        returnType: {
          kind: TypeKind.String,
          name: "string",
          isNullable: false,
        },
      };
      const dartType = emitType(irType);
      expect(dartType).toBe("String Function(num, bool?)");
    });

    it("should emit a rest parameter", () => {
      const irType: IRType = {
        kind: TypeKind.Function,
        name: "function",
        isNullable: false,
        parameters: [
          {
            name: "args",
            type: {
              kind: TypeKind.Array,
              name: "Array",
              isNullable: false,
              elementType: {
                kind: TypeKind.Any,
                name: "any",
                isNullable: false,
              },
            },
            isOptional: false,
            isRestParameter: true,
          },
        ],
        returnType: { kind: TypeKind.Void, name: "void", isNullable: false },
      };
      const dartType = emitType(irType);
      expect(dartType).toBe("void Function(List<dynamic>)"); // Common Dart pattern for rest params
    });
  });

  // --- Collections & Structures ---
  describe("Collections & Structures", () => {
    it("should emit a simple array type", () => {
      const irType: IRType = {
        kind: TypeKind.Array,
        name: "Array",
        isNullable: false,
        elementType: {
          kind: TypeKind.String,
          name: "string",
          isNullable: false,
        },
      };
      const dartType = emitType(irType);
      expect(dartType).toBe("List<String>");
    });

    it("should emit a generic type reference (e.g., Promise)", () => {
      const irType: IRType = {
        kind: TypeKind.TypeReference,
        name: "Promise",
        isNullable: false,
        genericArgs: [
          { kind: TypeKind.Number, name: "number", isNullable: false },
        ],
      };
      const dartType = emitType(irType);
      expect(dartType).toBe("Future<num>"); // Assuming Promise -> Future mapping
    });

    it("should emit a tuple type", () => {
      const irType: IRType = {
        kind: TypeKind.Tuple,
        name: "tuple",
        isNullable: false,
        tupleTypes: [
          { kind: TypeKind.String, name: "string", isNullable: false },
          { kind: TypeKind.Number, name: "number", isNullable: false },
        ],
      };
      const dartType = emitType(irType);
      expect(dartType).toBe("List<dynamic>"); // Common fallback for tuples
    });

    it("should fall back to dynamic for an unhoisted TypeLiteral", () => {
      const irType: IRType = {
        kind: TypeKind.TypeLiteral,
        name: "TypeLiteral",
        isNullable: false,
        objectLiteral: {
          /* properties, methods etc. */ properties: [],
          methods: [],
          constructors: [],
          getAccessors: [],
          setAccessors: [],
          indexSignatures: [],
        },
      };
      const dartType = emitType(irType);
      expect(dartType).toBe("dynamic");
    });
  });

  // --- Composites ---
  describe("Composite Types", () => {
    it("should emit a union of primitives (excluding null)", () => {
      const irType: IRType = {
        kind: TypeKind.Union,
        name: "union",
        isNullable: false,
        unionTypes: [
          { kind: TypeKind.String, name: "string", isNullable: false },
          { kind: TypeKind.Number, name: "number", isNullable: false },
        ],
      };
      const dartType = emitType(irType);
      // A common strategy is to fall back to a common supertype or dynamic.
      expect(dartType).toBe("dynamic /* String|num */");
    });

    it("should correctly identify a nullable union type", () => {
      const irType: IRType = {
        kind: TypeKind.Union,
        name: "union",
        isNullable: true, // This flag should be set by the parser
        unionTypes: [
          { kind: TypeKind.String, name: "string", isNullable: false },
        ],
      };
      const dartType = emitType(irType);
      expect(dartType).toBe("String?");
    });

    it("should emit an intersection type", () => {
      const irType: IRType = {
        kind: TypeKind.Intersection,
        name: "intersection",
        isNullable: false,
        intersectionTypes: [
          { kind: TypeKind.TypeReference, name: "A", isNullable: false },
          { kind: TypeKind.TypeReference, name: "B", isNullable: false },
        ],
      };
      const dartType = emitType(irType);
      // Intersection is often best represented by `dynamic` in package:js
      expect(dartType).toBe("dynamic");
    });
  });
});
