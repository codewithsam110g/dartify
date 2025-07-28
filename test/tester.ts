import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { Transpiler, TranspilerOptions } from "../src/main";
/**
 * Tests the entire Transpiler
 */
export function testTranspiler(contents: string): string {
  const tmpDir = join(process.cwd(), "tmp");
  const inFilename = join(tmpDir, "temp_test.d.ts");
  const outFileName = join(tmpDir, "temp_test.dart");
  // Ensure ./tmp exists
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir);
  }

  // Write or overwrite the file
  writeFileSync(inFilename, contents, "utf8");

  const transpiler = new Transpiler({
    files: [inFilename],
    outDir: tmpDir,
  });

  transpiler.transpile();

  return readFileSync(outFileName, "utf-8").split("\n").slice(7).join("\n");
}
