// Audit reproducer (CA): compares dartify's h3 output with the shipped
// js_facade_gen golden using the repository's own normalizer, but WITHOUT
// erasing nullability (`?`). Run from the repo root:
//   pnpm exec tsx audit/10-closing-17e8aa9/fixtures/h3-nullability-diff.ts
import { readFileSync } from "fs";
import { Transpiler } from "../../../src/transpiler";
import { normalizeDart } from "../../../test/conformance/normalize";

const keepNullability = (text: string) => text.replace(/([\w>)\]])\?(?=[\s,)>\]};])/g, "$1__NULLABLE");
const options = { ignoreDocs: true, inlineTypedefs: true };

const main = async () => {
  const golden = normalizeDart(keepNullability(readFileSync("def_files/h3/h3_web.golden.dart", "utf8")), options);
  const rendered = await new Transpiler({ files: ["def_files/h3/h3.d.ts"] }).render();
  const ours = normalizeDart(keepNullability([...rendered.files.values()][0].content), options);
  let differing = 0;
  for (const [name, lines] of golden) {
    const mine = ours.get(name);
    if (JSON.stringify(mine) === JSON.stringify(lines)) continue;
    differing++;
    console.log(`--- ${name}\n  golden: ${lines.join("\n          ")}\n  dartify: ${(mine ?? ["<missing>"]).join("\n          ")}`);
  }
  console.log(`\n${differing}/${golden.size} golden declarations differ once nullability is kept`);
  const goldenNullable = (readFileSync("def_files/h3/h3_web.golden.dart", "utf8").match(/[\w>]\?[\s,)>]/g) ?? []).length;
  console.log(`nullable type spellings in golden: ${goldenNullable}`);
};
main();
