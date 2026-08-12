// in tests/emitter.test.ts

import { describe, test, expect } from "vitest";
import * as emitter from "../../src/engine/emitter/old/index";
import {
  IRClass,
  IRInterface,
  IRFunction,
  IREnum,
  IRVariable,
  IRTypeAlias,
  IRDeclKind,
} from "../../src/ir/index"; // Assuming a barrel export for IR types
import { TypeKind, IRType } from "../../src/ir/type";
import { createTypeNode } from "../test-helper";

const TEST_MODIFIERS = {
  exportKind: "none" as const,
  isDeclare: false,
  isAmbient: false,
};

describe("Declaration Emitter Unit Tests", () => {
  // 1. Variable Statement
  test("emitVariable: should emit a simple variable", () => {
    const ir: IRVariable = {
      kind:IRDeclKind.Variable,
      modifiers: TEST_MODIFIERS,
      name: "testVar",
      isConst: false,
      declarationKind: "var",
      type: {
        kind: TypeKind.String,
        isNullable: false,
        name: "string",
      },
    };
    const result = emitter.emitVariable(ir, "");
    expect(result).toMatchInlineSnapshot(`
      "@JS("testVar")
      external String testVar;"
    `);
  });

  // 2. Function
  test("emitFunction: should emit a function with parameters", () => {
    const ir: IRFunction = {
      kind: IRDeclKind.Function,
      modifiers: TEST_MODIFIERS,
      name: "getUser",
      typeParams: [],
      parameters: [
        {
          name: "id",
          type: {
            kind: TypeKind.Number,
            name: "number",
            isNullable: false,
          },
          isOptional: false,
          isRest: false,
        },
        {
          name: "options",
          type: {
            kind: TypeKind.TypeReference,
            name: "Options",
            isNullable: true,
          },
          isOptional: true,
          isRest: false,
        },
      ],
      returnType: {
        kind: TypeKind.TypeReference,
        name: "User",
        isNullable: false,
      },
    };
    const result = emitter.emitFunction(ir, "");
    expect(result).toMatchInlineSnapshot(
      `
      "@JS("getUser")
      external User getUser(num id, [Options? options]);"
    `,
    );
  });

  // 3. Enum
  test("emitEnum: should emit a numeric enum", () => {
    const ir: IREnum = {
      kind:IRDeclKind.Enum,
      modifiers: TEST_MODIFIERS,
      name: "Direction",
      members: [
        { name: "Up", initializer: { kind: "implicit" } },
        { name: "Down", initializer: { kind: "implicit" } },
        {
          name: "Left",
          initializer: { kind: "number", text: "5", value: 5 },
        },
        { name: "Right", initializer: { kind: "implicit" } },
      ],
    };
    const result = emitter.emitEnum(ir, "");
    expect(result).toMatchInlineSnapshot(`
      "@JS("Direction")
      class Direction{}
      @JS("Direction")
      extension DirectionEnum on Direction{
        external static dynamic get Up;
        external static dynamic get Down;
        external static int get Left;
        external static dynamic get Right;
      }"
    `); // Note: Dart enums don't support explicit numeric values in the same way, this tests the name generation.
  });

  // 4. Interface (as @anonymous class with extension)
  test("emitInterface: should emit an interface with properties and methods", () => {
    const ir: IRInterface = {
      kind:IRDeclKind.Interface,
      modifiers: TEST_MODIFIERS,
      name: "User",
      typeParams: [],
      extends: [
        {
          kind: TypeKind.TypeReference,
          name: "Person",
          isNullable: false,
        },
      ],
      properties: [
        {
          name: "id",
          type: {
            kind: TypeKind.Number,
            name: "number",
            isNullable: false,
          },
          isOptional: false,
          isReadonly: true,
          isStatic: false,
          isAbstract: false,
        },
      ],
      methods: [
        {
          name: "getName",
          typeParams: [],
          parameters: [],
          returnType: {
            kind: TypeKind.String,
            name: "string",
            isNullable: false,
          },
          isOptional: false,
          isStatic: false,
          isAbstract: false,
        },
      ],
      // Empty arrays for other members
      callSignatures: [],
      constructSignatures: [],
      getAccessors: [],
      setAccessors: [],
      indexSignatures: [],
    };
    const result = emitter.emitInterface(ir, "");
    expect(result).toMatchInlineSnapshot(`
      "@JS()
      @anonymous
      abstract class User{}
      extension UserExtension on User {
        external num get id;
        @JS("getName")
        external String getName();
      }"
    `);
  });

  // 5. Class
  test("emitClass: should emit a class with a constructor and static method", () => {
    const ir: IRClass = {
      kind: IRDeclKind.Class,
      modifiers: TEST_MODIFIERS,
      name: "ApiClient",
      extends: {
        kind: TypeKind.TypeReference,
        name: "BaseClient",
        isNullable: false,
      },
      implements: [
        {
          kind: TypeKind.TypeReference,
          name: "IClient",
          isNullable: false,
        },
      ],
      isAbstract: false,
      typeParams: [{ name: "T" }],
      constructors: [
        {
          typeParams: [],
          parameters: [
            {
              name: "baseUrl",
              type: {
                kind: TypeKind.String,
                name: "string",
                isNullable: false,
              },
              isOptional: false,
              isRest: false,
            },
          ],
        },
      ],
      methods: [
        {
          name: "create",
          typeParams: [],
          parameters: [],
          returnType: {
            kind: TypeKind.TypeReference,
            name: "ApiClient",
            isNullable: false,
          },
          isOptional: false,
          isStatic: true,
          isAbstract: false,
        },
      ],
      // Empty arrays for other members
      properties: [],
      getAccessors: [],
      setAccessors: [],
      indexSignatures: [],
    };
    const result = emitter.emitClass(ir, "");
    expect(result).toMatchInlineSnapshot(`
      "@JS("ApiClient")
      class ApiClient {
        external factory ApiClient(String baseUrl);
        external static ApiClient create();
      }"
    `);
  });

  // 6. Type Alias
  test("emitTypeAlias: should emit a typedef", () => {
    const ir: IRTypeAlias = {
      kind:IRDeclKind.TypeAlias,
      modifiers: TEST_MODIFIERS,
      name: "StringOrNumber",
      typeParams: [],
      type: {
        kind:TypeKind.Any,
        name: TypeKind.Any,
        isNullable: false
      },
    };
    const result = emitter.emitTypeAlias(ir, "");
    expect(result).toMatchInlineSnapshot(`"typedef StringOrNumber = dynamic;"`);
  });
});
