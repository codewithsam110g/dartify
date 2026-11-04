// Audit reproducer: a `declare global` interface moves from one module file to
// another in a single change set (refactor / branch switch). The consumer
// b.d.ts never imports either file, so watch mode never re-links it.
//   pnpm exec tsx audit/10-closing-17e8aa9/fixtures/watch-global-move.ts
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Transpiler } from "../../../src/transpiler";
import { WatchSession } from "../../../src/watch";

const main = async () => {
  const dir = mkdtempSync(join(tmpdir(), "audit-watch-move-"));
  const global = "export {};\ndeclare global {\n  interface Gfoo { x: string; }\n}\n";
  writeFileSync(join(dir, "a.d.ts"), global);
  writeFileSync(join(dir, "c.d.ts"), "export declare const unrelated: number;\n");
  writeFileSync(join(dir, "b.d.ts"), "export declare function make(): Gfoo;\n");
  const inputs = ["a.d.ts", "b.d.ts", "c.d.ts"].map((f) => join(dir, f));
  const session = new WatchSession({ files: inputs, outDir: join(dir, "out"), write: false });
  await session.build();
  writeFileSync(join(dir, "a.d.ts"), "export declare const moved: boolean;\n");
  writeFileSync(join(dir, "c.d.ts"), `export declare const unrelated: number;\n${global.replace("export {};\n", "")}`);
  const watch = await session.build([join(dir, "a.d.ts"), join(dir, "c.d.ts")]);
  const cold = await new Transpiler({ files: inputs, outDir: join(dir, "out") }).render();
  const key = [...cold.files.keys()].find((p) => p.endsWith("b.dart"))!;
  const same = cold.files.get(key)!.content === watch.files.get(key)?.content;
  console.log(`b.dart identical: ${same}`);
  if (!same) {
    console.log("----- cold b.dart -----\n" + cold.files.get(key)!.content);
    console.log("----- watch b.dart -----\n" + watch.files.get(key)?.content);
  }
};
main();

// Scenario 2: a single-file edit — a module file *adds* the global the
// consumer already names.
const scenario2 = async () => {
  const dir = mkdtempSync(join(tmpdir(), "audit-watch-add-"));
  writeFileSync(join(dir, "a.d.ts"), "export declare const placeholder: number;\n");
  writeFileSync(join(dir, "b.d.ts"), "export declare function make(): Gfoo;\n");
  const inputs = ["a.d.ts", "b.d.ts"].map((f) => join(dir, f));
  const session = new WatchSession({ files: inputs, outDir: join(dir, "out"), write: false });
  await session.build();
  writeFileSync(join(dir, "a.d.ts"), "export declare const placeholder: number;\ndeclare global {\n  interface Gfoo { x: string; }\n}\n");
  const watch = await session.build([join(dir, "a.d.ts")]);
  const cold = await new Transpiler({ files: inputs, outDir: join(dir, "out") }).render();
  const key = [...cold.files.keys()].find((p) => p.endsWith("b.dart"))!;
  console.log(`scenario 2 (single-file add) b.dart identical: ${cold.files.get(key)!.content === watch.files.get(key)?.content}`);
};
setTimeout(scenario2, 0);
