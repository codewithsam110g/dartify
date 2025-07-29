// in tests/parser.test.ts

import { describe, it, expect } from "vitest";
import { createStatementNode } from "../test-helper";
import * as ts from "ts-morph";

// Import all your parser functions from the barrel
import {
  parseTypeAlias,
  parseClass,
  parseFunction,
  parseInterface,
  parseVariableStmt,
  parseEnum,
} from "../../src/parser";

describe("AST Parsers to IR", () => {
  // 1. Testing parseInterface
  describe("parseInterface()", () => {
    it("should parse a simple interface", () => {
      const node = createStatementNode(
        "export interface User { id: number; name: string; }",
      ) as ts.InterfaceDeclaration;
      const ir = parseInterface(node);
      expect(ir).toMatchSnapshot();
    });

    it("should parse an interface with optional and readonly members", () => {
      const node = createStatementNode(
        "interface Config { readonly host: string; port?: number; }",
      ) as ts.InterfaceDeclaration;
      const ir = parseInterface(node);
      expect(ir).toMatchSnapshot();
    });
  });

  // 2. Testing parseClass
  describe("parseClass()", () => {
    it("should parse a simple class with properties and a constructor", () => {
      const node = createStatementNode(
        "export class ApiClient { constructor(baseUrl: string); endpoint: string; }",
      ) as ts.ClassDeclaration;
      const ir = parseClass(node);
      expect(ir).toMatchSnapshot();
    });
  });

  // 3. Testing parseFunction
  describe("parseFunction()", () => {
    it("should parse a function declaration with parameters", () => {
      const node = createStatementNode(
        "export function getUser(id: number): User;",
      ) as ts.FunctionDeclaration;
      const ir = parseFunction(node);
      expect(ir).toMatchSnapshot();
    });
  });

  // 4. Testing parseVariableStmt
  describe("parseVariableStmt()", () => {
    it("should parse a variable statement", () => {
      const node = createStatementNode(
        "export declare const PI: 3.14159;",
      ) as ts.VariableStatement;
      const ir = parseVariableStmt(node);
      expect(ir).toMatchSnapshot();
    });
  });

  // 5. Testing parseEnum
  describe("parseEnum()", () => {
    it("should parse a numeric enum", () => {
      const node = createStatementNode(
        "export enum Direction { Up, Down, Left, Right }",
      ) as ts.EnumDeclaration;
      const ir = parseEnum(node);
      expect(ir).toMatchSnapshot();
    });
  });

  // 6. Testing parseTypeAlias
  describe("parseTypeAlias()", () => {
    it("should parse a type alias for a union type", () => {
      const node = createStatementNode(
        "export type StringOrNumber = string | number;",
      ) as ts.TypeAliasDeclaration;
      // This will work because the parser function handles its own dependencies internally.
      const ir = parseTypeAlias(node);
      expect(ir).toMatchSnapshot();
    });
  });
});
