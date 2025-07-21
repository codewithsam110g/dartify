// test_harness.ts
// A simple, focused script to stress-test the new IR-based type parser.

import { Project } from "ts-morph";
import { resolve } from "path";
import { parseType } from "../type/parser/type"; // Main entry point to your new parser

// --- Configuration ---
const TEST_FILE_PATH = resolve("./def_files/types.d.ts");

// --- Main Test Runner ---
function runTestHarness() {
  console.log("=============================================");
  console.log("  Dart Bindgen: Type Parser Test Harness");
  console.log("=============================================\n");

  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(TEST_FILE_PATH);

  console.log(`Loaded test file: ${TEST_FILE_PATH}\n`);

  // We only care about `declare` statements for this test
  const variableStatements = sourceFile.getVariableStatements();

  if (variableStatements.length === 0) {
    console.error("No `declare let ...` statements found in the test file.");
    return;
  }

  for (const statement of variableStatements) {
    for (const declaration of statement.getDeclarations()) {
      const varName = declaration.getName();
      const typeNode = declaration.getTypeNode();

      if (!typeNode) {
        console.warn(`-- SKIPPING: ${varName} (no explicit type node) --\n`);
        continue;
      }

      console.log(`// Processing: ${varName}`);
      console.log(`// TS Type:    ${typeNode.getText()}`);

      try {
        // --- THIS IS THE CORE OF THE TEST ---
        // Call your new parser with the extracted TypeNode
        const parsedIR = parseType(typeNode);
        // --- ---------------------------- ---
        if(parsedIR == undefined){
          continue;
        }
        console.log("✅ Parsed IR:");
        console.log(JSON.stringify(parsedIR, null, 2));
      } catch (e) {
        console.error("❌ ERROR while parsing:");
        if (e instanceof Error) {
          console.error(e.message);
          console.error(e.stack);
        } else {
          console.error(e);
        }
      }
      console.log("-".repeat(60));
    }
  }

  console.log("\nTest harness finished.");
}

// Execute the test runner
runTestHarness();
