import { testTranspiler } from "./tester";
import { expect, test } from "vitest";

test("simple test", () => {
  expect(testTranspiler("declare var a: number;")).toBe(
    `@JS("a")\nexternal num a;\n`,
  );
});

test("ignore super calls", () => {
  expect(testTranspiler("declare var a: number;")).toBe(
    `@JS("a")\nexternal num a;\n`,
  );
});
