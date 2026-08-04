#!/usr/bin/env node
/**
 * Dependency graph visualiser — internal tooling, not part of the shipped CLI.
 *
 * Runs phases 1 and 2 over a set of .d.ts files and renders the resulting
 * symbol dependency graph to SVG. Green/blue nodes link cleanly; red ones are
 * broken. Reading this graph is how linker regressions get spotted — a wall of
 * blue with no red is the goal.
 *
 * This lives outside `src/` on purpose. It used to be called from inside
 * `linkerPhase`, which dragged @viz-js/viz — a devDependency — into the
 * published bundle, where it accounted for ~70% of dist/cli.js (`L-07`, `D-07`).
 * The visualiser is a *consumer* of the linker's report, never a step inside it.
 *
 *   pnpm graph -d "def_files/leaflet/*.d.ts" -o graph.svg
 */

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import fg from "fast-glob";
import { instance } from "@viz-js/viz";
import { writeFile } from "fs/promises";
import { resolve } from "path";

import { Transpiler } from "@/transpiler";
import { buildDot } from "./graphModel";

interface GraphOptions {
  defFiles: string[];
  output: string;
  enableLogs: boolean;
}

const argv = yargs(hideBin(process.argv))
  .usage("Usage: pnpm graph -d <glob> [-o out.svg]")
  .option("def-files", {
    alias: "d",
    type: "array",
    describe: "TypeScript definition files or glob patterns",
    demandOption: true,
    coerce: (arg: string[] | string) => (Array.isArray(arg) ? arg : [arg]),
  })
  .option("output", {
    alias: "o",
    type: "string",
    describe: "Output SVG path",
    default: "dependency_graph.svg",
  })
  .option("enable-logs", {
    alias: "l",
    type: "boolean",
    describe: "Verbose linker output",
    default: false,
  })
  .help()
  .alias("help", "h")
  .parseSync() as GraphOptions;

async function main(options: GraphOptions): Promise<void> {
  const files = await fg(options.defFiles, {
    onlyFiles: true,
    absolute: true,
    ignore: ["node_modules/**", "*.min.d.ts"],
  });
  const dtsFiles = files.filter((f) => f.endsWith(".d.ts"));

  if (dtsFiles.length === 0) {
    console.error("No .d.ts files found matching patterns");
    process.exit(1);
  }

  console.log(`Analysing ${dtsFiles.length} file(s)...`);

  const transpiler = new Transpiler({
    files: dtsFiles,
    debug: options.enableLogs,
  });
  const analysis = await transpiler.analyze();
  const report = analysis.link;

  if (report.results.size === 0) {
    console.error("No symbols were generated — nothing to graph.");
    process.exit(1);
  }

  const viz = await instance();
  const svg = viz.renderString(buildDot(report), { format: "svg" });

  const outputPath = resolve(process.cwd(), options.output);
  await writeFile(outputPath, svg);

  console.log(
    `\n  📈 ${report.results.size} symbols · ${report.valid} linked · ${report.broken} broken`,
  );
  console.log(`  📈 Dependency graph written to: ${outputPath}`);
}

main(argv);
