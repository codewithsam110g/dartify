// Audit probe for registered fixes without regression tests (CA-23).
// Run from the repo root: pnpm exec tsx audit/10-closing-17e8aa9/fixtures/untested-fixes.ts
import { Transpiler } from "../../../src/transpiler";
const run = async (label: string, src: string) => {
  const r = await Transpiler.transpileFromString(src, { fileName: "/m.d.ts" });
  console.log(`== ${label}\n${r.content.split("\n").filter((l) => /external|class|typedef|Function/.test(l)).join("\n")}`);
};
(async () => {
  await run("P-18 this: in function type", "export type Handler = (this: Window, a: string, b: number) => boolean;\nexport declare function on(h: (this: Element, ev: string) => void): void;");
  await run("E-20 abstract class", "export declare abstract class Shape { abstract area(): number; }");
  const native = await new Transpiler({ files: ["audit/10-closing-17e8aa9/fixtures/backend/native/native.d.ts"] }).render();
  for (const f of native.files.values()) console.log("== E-44 diagnostics:", JSON.stringify(f.diagnostics.map((d) => d.code)));
})();
