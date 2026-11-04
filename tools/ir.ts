#!/usr/bin/env node
/**
 * IR dump — internal tooling, not part of the shipped CLI (`R-08`, `D-05`).
 *
 * Runs phases 1 and 2 and writes the owned `LinkedProgram` as JSON: every
 * symbol with its facets, IR and resolved dependencies, plus the resolution,
 * generation and link reports. Like `tools/graph.ts`, it observes returned
 * phase values and is never a step inside the pipeline (design principle 5).
 *
 *   pnpm ir -d "def_files/h3/h3.d.ts" -o h3.ir.json
 */

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import fg from "fast-glob";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { Transpiler } from "@/transpiler";

const argv = yargs(hideBin(process.argv))
  .usage("Usage: pnpm ir -d <glob> [-o out.json]")
  .option("def-files", {
    alias: "d",
    type: "array",
    describe: "TypeScript definition files or glob patterns",
    demandOption: true,
  })
  .option("output", {
    alias: "o",
    type: "string",
    describe: "Output JSON path",
    default: "ir.json",
  })
  .parseSync();

async function main(): Promise<void> {
  const patterns = (argv["def-files"] as (string | number)[]).map(String);
  const files = fg.sync(patterns, { absolute: true, onlyFiles: true }).sort();
  if (files.length === 0) throw new Error("No .d.ts files matched");
  const { analysis, program } = await new Transpiler({ files }).analyzeProgram();
  const json = JSON.stringify(
    {
      resolution: analysis.resolution,
      generation: analysis.generation,
      link: { ...analysis.link, results: Object.fromEntries(analysis.link.results) },
      moduleExports: Object.fromEntries(program.moduleExports.byFile),
      symbols: Object.fromEntries(program.symbols),
    },
    (_, value) => (typeof value === "bigint" ? `${value}n` : value),
    2,
  );
  const output = resolve(argv.output);
  await writeFile(output, json, "utf8");
  console.log(`Wrote ${program.symbols.size} symbol groups to ${output}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
