// Audit reproducer for CA-15: inputs in sibling directories that share a
// string prefix (types/ and types2/). Starts `dartify -w`, edits a file in
// types2/, and reports whether a rebuild was observed.
//   node audit/10-closing-17e8aa9/fixtures/watch-root-prefix.cjs
const { spawn } = require("child_process");
const { mkdtempSync, mkdirSync, writeFileSync } = require("fs");
const { join } = require("path");
const os = require("os");
const dir = mkdtempSync(join(os.tmpdir(), "audit-watchroot-"));
for (const sub of ["types", "types2"]) mkdirSync(join(dir, sub));
writeFileSync(join(dir, "types", "a.d.ts"), "export interface A { a: string; b: number; }\n");
writeFileSync(join(dir, "types2", "b.d.ts"), "export interface B { a: string; b: number; }\n");
const cli = spawn("pnpm", ["-s", "dev", "-d", join(dir, "types", "a.d.ts"), "-d", join(dir, "types2", "b.d.ts"), "-o", join(dir, "out"), "-w"], { cwd: process.cwd() });
let output = "";
cli.stdout.on("data", (d) => (output += d));
cli.stderr.on("data", (d) => (output += d));
const watching = () => /Watching/.test(output);
const step = (fn, ms) => new Promise((r) => setTimeout(() => { fn(); r(); }, ms));
(async () => {
  for (let i = 0; i < 60 && !watching(); i++) await step(() => {}, 500);
  const before = (output.match(/Rebuilt/g) || []).length;
  await step(() => writeFileSync(join(dir, "types2", "b.d.ts"), "export interface B { a: string; b: number; c: boolean; }\n"), 300);
  await step(() => {}, 3000);
  const afterSibling = (output.match(/Rebuilt/g) || []).length;
  await step(() => writeFileSync(join(dir, "types", "a.d.ts"), "export interface A { a: string; b: number; c: boolean; }\n"), 300);
  await step(() => {}, 3000);
  const afterRoot = (output.match(/Rebuilt/g) || []).length;
  cli.kill("SIGTERM");
  console.log(output.split("\n").filter((l) => /Watching|Rebuilt|Initial/.test(l)).map((l) => l.replaceAll(dir, "<tmp>")).join("\n"));
  console.log(`rebuilds after editing types2/b.d.ts: ${afterSibling - before}`);
  console.log(`rebuilds after editing types/a.d.ts:  ${afterRoot - afterSibling}`);
  process.exit(0);
})();
