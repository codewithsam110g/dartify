// Audit reproducer: watch-mode differential cases not in
// test/watch-differential.test.ts. After each edit, WatchSession.build()
// output is compared byte-for-byte with a cold Transpiler.render().
//   pnpm exec tsx audit/10-closing-17e8aa9/fixtures/watch-global-augmentation.ts
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Transpiler } from "../../../src/transpiler";
import { WatchSession } from "../../../src/watch";

interface Scenario { name: string; files: Record<string, string>; edit: [string, string]; inputs: string[] }

const scenarios: Scenario[] = [
  {
    name: "module file's `declare global` renamed; consumer never imports it",
    files: {
      "a.d.ts": "export {};\ndeclare global {\n  interface Gfoo { x: string; }\n}\n",
      "b.d.ts": "export declare function make(): Gfoo;\n",
    },
    edit: ["a.d.ts", "export {};\ndeclare global {\n  interface Gbar { x: string; }\n}\n"],
    inputs: ["a.d.ts", "b.d.ts"],
  },
  {
    name: "typeof a const in an imported file changes literal type (consumer text unchanged)",
    files: {
      "a.d.ts": "export declare const LIMIT: 10;\n",
      "b.d.ts": "import { LIMIT } from './a';\nexport declare function f(x: typeof LIMIT): void;\n",
    },
    edit: ["a.d.ts", 'export declare const LIMIT: "ten";\n'],
    inputs: ["a.d.ts", "b.d.ts"],
  },
  {
    name: "type alias in an imported file changes from union to string",
    files: {
      "a.d.ts": "export type Id = string | number;\n",
      "b.d.ts": "import { Id } from './a';\nexport declare function get(id: Id): void;\n",
    },
    edit: ["a.d.ts", "export type Id = string;\n"],
    inputs: ["a.d.ts", "b.d.ts"],
  },
];

const main = async () => {
  let failures = 0;
  for (const scenario of scenarios) {
    const dir = mkdtempSync(join(tmpdir(), "audit-watch-"));
    for (const [file, text] of Object.entries(scenario.files)) writeFileSync(join(dir, file), text);
    const inputs = scenario.inputs.map((file) => join(dir, file));
    const out = join(dir, "out");
    const session = new WatchSession({ files: inputs, outDir: out, write: false });
    await session.build();
    writeFileSync(join(dir, scenario.edit[0]), scenario.edit[1]);
    const incremental = await session.build([join(dir, scenario.edit[0])]);
    const cold = await new Transpiler({ files: inputs, outDir: out }).render();
    const diffs: string[] = [];
    for (const [path, file] of cold.files) {
      const mine = incremental.files.get(path)?.content;
      if (mine !== file.content) diffs.push(`${path}\n----- cold -----\n${file.content}\n----- watch -----\n${mine}`);
    }
    for (const path of incremental.files.keys()) if (!cold.files.has(path)) diffs.push(`extra output ${path}`);
    const coldValid = cold.analysis.link.valid, watchValid = incremental.analysis.link.valid;
    if (coldValid !== watchValid) diffs.push(`link report valid: cold=${coldValid} watch=${watchValid}`);
    console.log(`${diffs.length === 0 ? "PASS" : "FAIL"}: ${scenario.name}`);
    for (const diff of diffs) console.log(diff.replaceAll(dir, "<tmp>"));
    if (diffs.length) failures++;
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(`\n${failures} of ${scenarios.length} scenarios diverge from a cold build`);
};
main();
