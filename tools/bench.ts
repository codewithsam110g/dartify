#!/usr/bin/env node
/**
 * Watch-mode latency benchmark — internal tooling, not shipped.
 *
 *   pnpm bench
 *
 * For each corpus, copies it to a temporary directory, runs a cold
 * `WatchSession` build, then measures rebuilds after: no change, an edit to a
 * file nothing imports (leaf), and an edit to a widely imported file (core).
 * Each edit is the median of several runs; timings come from the session's
 * own phase clock (resolve, generate, link, render, write). After every
 * simulated edit the incremental output is compared byte for byte with a
 * fresh cold compilation (outside the timed region); any difference aborts.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, relative, resolve } from "path";
import { WatchSession, WatchTimings } from "@/watch";
import { Transpiler } from "@/transpiler";

interface Corpus {
  name: string;
  root: string;
  inputs: string[];
  leaf: string;
  core?: string;
}

const CORPORA: Corpus[] = [
  { name: "h3", root: "def_files/h3", inputs: ["h3.d.ts"], leaf: "h3.d.ts" },
  {
    name: "leaflet",
    root: "def_files/leaflet",
    inputs: ["leaflet.d.ts", "geojson.d.ts"],
    leaf: "leaflet.d.ts",
    core: "geojson.d.ts",
  },
  {
    name: "three.js",
    root: "def_files/three",
    inputs: ["src/Three.Core.d.ts"],
    leaf: "src/helpers/AxesHelper.d.ts",
    core: "src/math/Vector3.d.ts",
  },
];

const RUNS = 5;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function format(timings: WatchTimings): string {
  return `${String(timings.total).padStart(7)} ms  (resolve ${timings.resolve}, generate ${timings.generate}, link ${timings.link}, render ${timings.render}, write ${timings.write})`;
}

let verified = 0;

async function verify(build: Awaited<ReturnType<WatchSession["build"]>>, files: string[], outDir: string, label: string) {
  const fresh = await new Transpiler({ files, outDir }).render();
  const left = [...build.files].map(([path, file]) => [path, file.content]).sort();
  const right = [...fresh.files].map(([path, file]) => [path, file.content]).sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`incremental output differs from a cold compilation after: ${label}`);
  }
  verified++;
}

async function measure(
  session: WatchSession,
  file: string | undefined,
  files: string[],
  outDir: string,
): Promise<WatchTimings & { rebuilt: number }> {
  const samples: (WatchTimings & { rebuilt: number })[] = [];
  for (let run = 0; run < RUNS; run++) {
    // A real edit: a new member on the first class or interface, which
    // changes that declaration's members (and re-renders its subclasses).
    if (file) {
      const text = readFileSync(file, "utf8");
      const edited = text.replace(/\b(interface|class) [A-Za-z_$][\w$]*[^{;]*\{/, (head) => `${head}\n    benchMember${run}?: number;`);
      writeFileSync(file, edited === text ? `${text}\n// edit ${run}\n` : edited);
    }
    const build = await session.build(file ? [file] : []);
    samples.push({ ...build.timings, rebuilt: build.rebuilt.length });
    await verify(build, files, outDir, `${file ?? "no change"} #${run}`);
  }
  const totals = samples.map((sample) => sample.total);
  const middle = samples.find((sample) => sample.total === median(totals))!;
  return middle;
}

async function main(): Promise<void> {
  for (const corpus of CORPORA) {
    const root = mkdtempSync(join(tmpdir(), `dartify-bench-${corpus.name.replace(/\W/g, "")}-`));
    try {
      cpSync(resolve(corpus.root), root, { recursive: true });
      const files = corpus.inputs.map((input) => join(root, input));
      const outDir = join(root, "out");
      const session = new WatchSession({ files, outDir });
      const cold = await session.build();
      console.log(`\n${corpus.name} — ${cold.files.size} libraries`);
      console.log(`  cold build      ${format(cold.timings)}`);
      const idle = await measure(session, undefined, files, outDir);
      console.log(`  no change       ${format(idle)}`);
      const leaf = await measure(session, join(root, corpus.leaf), files, outDir);
      console.log(`  leaf edit       ${format(leaf)}  [${leaf.rebuilt} file(s) rebuilt: ${relative(root, join(root, corpus.leaf))}]`);
      if (corpus.core) {
        const core = await measure(session, join(root, corpus.core), files, outDir);
        console.log(`  core edit       ${format(core)}  [${core.rebuilt} file(s) rebuilt: ${corpus.core}]`);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  console.log(`\n${verified} incremental builds verified byte-for-byte against cold compilations.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
