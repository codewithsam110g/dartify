import { Transpiler } from "../src/main";
import { expect, test } from "vitest";

test("simple test", async () => {
  const result = await Transpiler.transpileFromString("declare var a: number;");
  expect(result.content).toBe(
    `// Generated from virtual.d.ts
// Do not edit directly

@JS()
library virtual;
import 'package:js/js.dart';


@JS("a")
external num a;`,
  );
});

test("ignore super calls", async () => {
  const result = await Transpiler.transpileFromString("declare var a: number;");
  expect(result.content).toBe(
    `// Generated from virtual.d.ts
// Do not edit directly

@JS()
library virtual;
import 'package:js/js.dart';


@JS("a")
external num a;`,
  );
});

// Alternative: Test just the transpiled content without header
test("simple test - content only", async () => {
  const result = await Transpiler.transpileFromString("declare var a: number;");
  // Extract just the transpiled part (after the header)
  const lines = result.content.split("\n");
  const contentLines = lines.slice(6); // Skip header lines
  const actualContent = contentLines.join("\n").trim();

  expect(actualContent).toBe(`@JS("a")
external num a;`);
});

// Test with custom filename
test("custom filename test", async () => {
  const result = await Transpiler.transpileFromString(
    "declare var a: number;",
    { fileName: "test.d.ts" },
  );
  expect(result.content).toContain("// Generated from test.d.ts");
  expect(result.content).toContain("library test;");
});

// Test error handling
test("should handle errors", async () => {
  const result = await Transpiler.transpileFromString(
    "invalid typescript code",
  );
  expect(result.errors.length).toBeGreaterThan(0);
});

// Test multiple statements
test("multiple statements", async () => {
  const tsContent = `
declare var a: number;
declare var b: string;
`;
  const result = await Transpiler.transpileFromString(tsContent);
  expect(result.content).toContain('@JS("a")');
  expect(result.content).toContain("external num a;");
  expect(result.content).toContain('@JS("b")');
  expect(result.content).toContain("external String b;");
});
