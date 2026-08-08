import { expect, test, describe } from "vitest";
import { createTypeNode, normalizeIRSnapshot } from "../test-helper";
import { parseType } from "../../src/engine/parser/type/type";
describe("Type Parser Snapshot Test", () => {
  test("Primitives - String", () => {
    const node = createTypeNode("string");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Primitives - Bool", () => {
    const node = createTypeNode("boolean");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Primitives - Number", () => {
    const node = createTypeNode("number");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Primitives - void", () => {
    const node = createTypeNode("void");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });

  test("Union - String? 1", () => {
    const node = createTypeNode("string | null");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Union - String? 2", () => {
    const node = createTypeNode("string | undefined");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Union - String? 3", () => {
    const node = createTypeNode("string | null | undefined");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Complex Union - A | B", () => {
    const node = createTypeNode("string | number");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Complex Union - A | B | undef", () => {
    const node = createTypeNode("string | number | undefined");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });

  test("Array - T[]", () => {
    const node = createTypeNode("string[]");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Array - Array<T>", () => {
    const node = createTypeNode("Array<String>");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Complex Array T", () => {
    const node = createTypeNode("(string | number)[]");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });

  test("tuple - [A, B]", () => {
    const node = createTypeNode("[string, number]");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("tuple - [A, A, A]", () => {
    const node = createTypeNode("[string, string, string]");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });

  test("Type References - basic", () => {
    const node = createTypeNode("HTMLElement");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });

  test("Generics - Promise<T>", () => {
    const node = createTypeNode("Promise<string>");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Generics - Map<K, V>", () => {
    const node = createTypeNode("Map<string, number>");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });

  test("Functions - Params: 1, no return", () => {
    const node = createTypeNode("(a: string) => void");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Functions - Params: 1, return", () => {
    const node = createTypeNode("(a: string) => number");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Functions - Optional Parameter", () => {
    const node = createTypeNode("(a: string, b: number) => void");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
  test("Functions - Rest Parameter", () => {
    const node = createTypeNode("(a: string, ...args:number[]) => number");
    expect(normalizeIRSnapshot(parseType(node))).toMatchSnapshot();
  });
});
