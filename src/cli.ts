#!/usr/bin/env node
/**
 * Copyright 2025 Samba Siva Rao Kovvuru <codewithsam110g>
 * Licensed under the Apache License, Version 2.0
 * https://www.apache.org/licenses/LICENSE-2.0
 */

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import path from "path";
import { RenderReport, TranspileException, Transpiler } from "./transpiler";
import { collectInputs } from "./cliInputs";
import {
  CliOptions,
  CliUsageError,
  ParsedArgs,
  resolveCliOptions,
} from "./cliOptions";
import { reportGenerationFailures, reportRun } from "./reporting/run";
import { displayPath, isInside } from "./reporting/path";
import type { GenerationDiagnostic } from "./engine/phase/symbolGeneration";
// Named import so the bundler keeps only `version`, not scripts/devDependencies.
import { version } from "../package.json";

const DEFAULT_OUTPUT = "./dart_out";

const COMPATIBILITY = "js_facade_gen compatibility:";

const argv = yargs(hideBin(process.argv))
  .usage("Usage: dart_bindgen [options] [inputs...]")
  .command("$0 [inputs..]", "Generate Dart bindings from declaration files", (command) =>
    command.positional("inputs", {
      type: "string",
      array: true,
      describe:
        "Declaration files or glob patterns, like -d. Without -o/--destination, a single resulting library is printed to stdout",
    }),
  )
  .option("def-files", {
    alias: "d",
    type: "array",
    describe: "TypeScript declaration files (.d.ts, .d.mts, .d.cts) or glob patterns",
    coerce: (arg: string[] | string) => (Array.isArray(arg) ? arg : [arg]),
  })
  .option("output", {
    alias: ["o", "destination"],
    type: "string",
    describe: `Output directory (default ${DEFAULT_OUTPUT})`,
  })
  .option("base-path", {
    type: "string",
    describe: "Directory output paths are relative to; every input must lie under it",
  })
  .option("enable-logs", {
    alias: "l",
    type: "boolean",
    describe: "Enable phase and module-resolution logging",
    default: false,
  })
  .option("verbose", {
    alias: "v",
    type: "boolean",
    describe: "Show detailed structured linker diagnostics (implies -l)",
    default: false,
  })
  .option("dry-run", {
    type: "boolean",
    describe: "Show what would be processed without doing it",
    default: false,
  })
  .option("watch", {
    alias: "w",
    type: "boolean",
    describe: "Rebuild incrementally whenever an input changes",
    default: false,
  })
  .option("js-root", {
    type: "string",
    describe: "Global that module libraries are reached through (e.g. THREE)",
  })
  .option("tsconfig", {
    alias: "p",
    type: "string",
    describe: "Path to tsconfig.json for module resolution (handles pnpm, node_modules, etc.)",
  })
  .option("skip-formatting", {
    type: "boolean",
    describe: "Accepted and ignored: dartify never runs a formatter",
    group: COMPATIBILITY,
  })
  .option("generate-html", {
    type: "boolean",
    describe: "Not supported (exits with an explanation)",
    group: COMPATIBILITY,
  })
  .option("rename-conflicting-types", {
    type: "boolean",
    describe: "Not supported (exits with an explanation)",
    group: COMPATIBILITY,
  })
  .option("explicit-static", {
    type: "boolean",
    describe: "Not supported (exits with an explanation)",
    group: COMPATIBILITY,
  })
  .option("trust-js-types", {
    type: "boolean",
    describe: "Not supported (exits with an explanation)",
    group: COMPATIBILITY,
  })
  .example("dart_bindgen types/lib.d.ts", "Print the Dart library for one declaration file to stdout")
  .example('dart_bindgen -d "**/*.d.ts"', "Process all declaration files recursively")
  .example(
    'dart_bindgen -d "src/*.d.ts" -d "lib/*.d.ts" -o ./output',
    "Multiple patterns with custom output",
  )
  .example(
    "dart_bindgen --destination=out --base-path=types types/a.d.ts types/b.d.ts",
    "js_facade_gen's invocation shape",
  )
  .example(
    'dart_bindgen --def-files "types/**/*.d.ts" -lv',
    "Enable logs and print the detailed linker report",
  )
  .example('dart_bindgen -d "types/**/*.d.ts" -o ./generated -w', "Watch and rebuild on change")
  // Unknown flags are errors: a flag that silently did nothing would change
  // what the user thinks was generated.
  .strict()
  .showHelpOnFail(false, "Run dart_bindgen --help for usage.")
  .help()
  .alias("help", "h")
  .version(version)
  .parseSync() as ParsedArgs;

/**
 * In stdout mode the Dart library is the only thing on stdout, so every
 * other line of output, including the pipeline's own logging, goes to stderr.
 */
function routeLogsToStderr(): void {
  console.log = (...args: unknown[]) => console.error(...args);
}

async function main(args: ParsedArgs): Promise<number> {
  const startTime = Date.now();

  let options: CliOptions;
  try {
    options = resolveCliOptions(args);
  } catch (error) {
    if (!(error instanceof CliUsageError)) throw error;
    for (const message of error.messages) console.error(`Error: ${message}`);
    return 1;
  }
  if (options.toStdout) routeLogsToStderr();
  const logsEnabled = options.enableLogs || options.verbose;

  try {
    const selection = await collectInputs(options.inputs);
    // Every bad explicit input is reported before any generation, so a typo
    // never yields a successful run that quietly lacks a file (HD-04).
    for (const message of selection.errors) console.error(`Error: ${message}`);
    if (selection.errors.length > 0) return 1;
    for (const message of selection.notices) console.log(message);
    for (const message of selection.warnings) console.warn(`Warning: ${message}`);
    const files = selection.files;

    if (logsEnabled) {
      console.log(`Patterns: ${options.inputs.join(", ")}`);
      console.log(`Found ${files.length} declaration files`);
    }

    if (files.length === 0) {
      console.error(`Error: no declaration files found matching: ${options.inputs.join(", ")}`);
      return 1;
    }

    if (options.basePath) {
      const root = path.resolve(options.basePath);
      const outside = files.filter((file) => !isInside(root, file));
      for (const file of outside) {
        console.error(`Error: input ${displayPath(file)} lies outside --base-path ${options.basePath}`);
      }
      if (outside.length > 0) return 1;
    }

    if (logsEnabled || options.dryRun) {
      console.log("\nFiles to process:");
      files.forEach((file, i) => {
        console.log(`  ${i + 1}. ${displayPath(file)}`);
      });
    }

    if (options.dryRun) {
      console.log(`\nDry run complete. Would process ${files.length} files.`);
      return 0;
    }

    if (options.watch) {
      await watchFiles(files, options);
      return 0;
    }

    console.log("\nProcessing files...");
    const code = await processFiles(files, options);
    if (code === 0) console.log(`Completed in ${Date.now() - startTime}ms`);
    return code;
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    return 1;
  }
}

function failGeneration(failures: readonly GenerationDiagnostic[], outcome: string): number {
  reportGenerationFailures(failures);
  console.error(`Error: generation failed with ${failures.length} error(s); ${outcome}`);
  return 1;
}

async function processFiles(files: string[], options: CliOptions): Promise<number> {
  console.log(
    `Processing ${files.length} files to ${options.toStdout ? "stdout" : (options.output ?? DEFAULT_OUTPUT)}`,
  );

  const transpiler = new Transpiler({
    files,
    outDir: options.output,
    debug: options.enableLogs || options.verbose,
    tsConfigFilePath: options.tsconfig
      ? path.resolve(process.cwd(), options.tsconfig)
      : undefined,
    ...(options.jsRoot ? { jsRoot: options.jsRoot } : {}),
    ...(options.basePath ? { inputRoot: options.basePath } : {}),
  });

  let report: RenderReport;
  if (options.toStdout) {
    report = await transpiler.render();
    if (report.analysis.generation.length > 0) {
      return failGeneration(report.analysis.generation, "no output was produced");
    }
  } else {
    try {
      report = await transpiler.transpile();
    } catch (error) {
      if (error instanceof TranspileException && error.code === "GENERATION_FAILED" && error.diagnostics) {
        return failGeneration(error.diagnostics, "nothing was written");
      }
      throw error;
    }
  }

  reportRun(report, { verbose: options.verbose });

  if (options.toStdout) {
    const libraries = [...report.files.values()];
    if (libraries.length > 1) {
      console.error(
        `Error: the input produced ${libraries.length} Dart libraries; printing to stdout needs exactly one. Pass --destination <dir> (or -o) to write them.`,
      );
      return 1;
    }
    if (libraries.length === 0) {
      console.error("Note: the input declares nothing to bind, so there is no output.");
    } else {
      process.stdout.write(libraries[0].content);
    }
  }
  return 0;
}

/**
 * Watch mode: one incremental `WatchSession`, rebuilt on every change under
 * the inputs' common directory. Changes are debounced so an editor's save
 * burst becomes one rebuild.
 */
async function watchFiles(files: string[], options: CliOptions): Promise<void> {
  const { WatchSession } = await import("./watch");
  const { watch } = await import("fs");
  const session = new WatchSession({
    files,
    outDir: options.output,
    tsConfigFilePath: options.tsconfig ? path.resolve(process.cwd(), options.tsconfig) : undefined,
    ...(options.jsRoot ? { jsRoot: options.jsRoot } : {}),
    ...(options.basePath ? { inputRoot: options.basePath } : {}),
  });
  const report = (label: string, build: Awaited<ReturnType<typeof session.build>>) => {
    // The same report a one-shot run prints, on the first build and on every rebuild.
    reportRun(build, { verbose: options.verbose });
    const failures = build.analysis.generation.length;
    const status = failures > 0 ? `⚠️  ${failures} generation error(s); nothing written` : `wrote ${build.written.length}`;
    console.log(
      `${label}: ${build.files.size} libraries, rebuilt ${build.rebuilt.length} source file(s), ${status} — ${build.timings.total} ms`,
    );
  };
  report("Initial build", await session.build());
  // Warm the incremental path (statement replay, partial link and render) so
  // the first real edit is as fast as later ones; outputs are unchanged.
  await session.build([files[0]]);

  const roots = [...new Set(files.map((file) => path.dirname(file)))];
  const root = roots.reduce((common, directory) => {
    while (!directory.startsWith(common)) common = path.dirname(common);
    return common;
  });
  const pending = new Set<string>();
  let timer: NodeJS.Timeout | undefined;
  let running = Promise.resolve();
  const flush = () => {
    const changed = [...pending];
    pending.clear();
    running = running.then(async () => {
      try {
        report(`Rebuilt (${changed.map((file) => path.relative(process.cwd(), file)).join(", ")})`, await session.build(changed));
      } catch (error) {
        console.error("Rebuild failed:", error instanceof Error ? error.message : error);
      }
    });
  };
  watch(root, { recursive: true }, (_, fileName) => {
    // `.ts`, `.mts` and `.cts`: declaration inputs and the files they import.
    if (!fileName || !/\.[cm]?ts$/.test(fileName.toString())) return;
    pending.add(path.resolve(root, fileName.toString()));
    clearTimeout(timer);
    timer = setTimeout(flush, 25);
  });
  console.log(`Watching ${path.relative(process.cwd(), root) || "."} for changes (Ctrl+C to stop)`);
  await new Promise(() => undefined);
}

main(argv).then(
  (code) => {
    // Exit code rather than `process.exit`, so output already written to a
    // pipe (the library on stdout) is flushed.
    process.exitCode = code;
  },
  (error) => {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  },
);
