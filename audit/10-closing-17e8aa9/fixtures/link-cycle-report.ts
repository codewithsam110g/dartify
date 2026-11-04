// Audit reproducer: link-state memoisation inside a reference cycle.
// A -> B, B -> A, and A -> Missing. B depends on A, which is broken, so B
// should be NotLinkedIndirect; check what the report says.
//   pnpm exec tsx audit/10-closing-17e8aa9/fixtures/link-cycle-report.ts
import { Transpiler } from "../../../src/transpiler";
(async () => {
  const src = [
    "export interface A { b: B; m: Missing; }",
    "export interface B { a: A; }",
  ].join("\n");
  const result = await Transpiler.transpileFromString(src, { fileName: "/cycle.d.ts" });
  for (const [fqn, state] of result.program!.report.results) console.log(fqn, "=>", state.state);
  console.log("valid", result.program!.report.valid, "broken", result.program!.report.broken);
})();
