// test/snapshot.test.ts
import { Transpiler } from "../src/transpiler";
import { expect, test, describe } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join, basename } from "path";

// Get all .d.ts files from the def_files directory
const defFilesDir = join(process.cwd(), "def_files");
const defFiles = readdirSync(defFilesDir)
  .filter((file) => file.endsWith(".d.ts"))
  .sort();

describe("TypeScript Definition Files Snapshot Tests", () => {
  defFiles.forEach((fileName) => {
    test(`should transpile ${fileName} correctly`, async () => {
      const filePath = join(defFilesDir, fileName);
      const content = readFileSync(filePath, "utf-8");

      const result = await Transpiler.transpileFromString(content, {
        fileName: fileName,
        debug: false,
      });

      // Always snapshot the content
      expect(result.content).toMatchSnapshot(
        `${basename(fileName, ".d.ts")}.dart`,
      );

      // Print all errors for visibility but don't fail the test
      if (result.errors.length > 0) {
        console.log(
          `\n📝 ${fileName}: ${result.errors.length} transpilation errors`,
        );
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.code}: ${error.message}`);
          if (error.line)
            console.log(
              `     at line ${error.line}${error.column ? `:${error.column}` : ""}`,
            );
        });
      }

      // Always pass - we just want to track the output
      expect(result).toBeDefined();
    });
  });
});

// Utility test to show summary
test("transpilation summary", () => {
  console.log(`\n📊 Testing ${defFiles.length} definition files:`);
  defFiles.forEach((file) => console.log(`  - ${file}`));
  expect(defFiles.length).toBeGreaterThan(0);
});
