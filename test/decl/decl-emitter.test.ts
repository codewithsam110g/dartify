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

describe("Declaration Emitter Unit Tests", () => {
  // 1. Variable Statement
  test("emitVariable: should emit a simple variable", () => {
    const ir: IRVariable = {
      kind:IRDeclKind.Variable,
      name: "testVar",
      isConst: false,
      isReadonly: false,
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
      name: "getUser",
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
      name: "Direction",
      members: [
        { name: "Up" },
        { name: "Down" },
        { name: "Left", value: 5 },
        { name: "Right" },
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
      name: "User",
      extends: ["Person"],
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
        },
      ],
      methods: [
        {
          name: "getName",
          parameters: [],
          returnType: {
            kind: TypeKind.String,
            name: "string",
            isNullable: false,
          },
          isOptional: false,
          isStatic: false,
        },
      ],
      // Empty arrays for other members
      constructors: [],
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
      name: "ApiClient",
      extends: "BaseClient",
      implements: ["IClient"],
      isAbstract: false,
      typeParams: ["T"],
      constructors: [
        {
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
          parameters: [],
          returnType: {
            kind: TypeKind.TypeReference,
            name: "ApiClient",
            isNullable: false,
          },
          isOptional: false,
          isStatic: true,
        },
      ],
      // Empty arrays for other members
      properties: [],
      getAccessors: [],
      setAccessors: [],
    };
    const result = emitter.emitClass(ir, "");
    expect(result).toMatchInlineSnapshot(`
      "@JS("ApiClient")
      class ApiClient {
        external factory ApiClient(String baseUrl);
        @JS("create")
        external ApiClient create();
      }"
    `);
  });

  // 6. Type Alias
  test("emitTypeAlias: should emit a typedef", () => {
    const ir: IRTypeAlias = {
      kind:IRDeclKind.TypeAlias,
      name: "StringOrNumber",
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
