#!/usr/bin/env node
/**
 * Copyright 2025 Samba Siva Rao Kovvuru <codewithsam110g>
 * Licensed under the Apache License, Version 2.0
 * https://www.apache.org/licenses/LICENSE-2.0
 */

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import fg from "fast-glob";
import { promises as fsPromises, constants as fsConstants } from "fs";
import path from "path";
import { Transpiler, TranspilerOptions } from "./transpiler";
import { formatVerboseLinkReport } from "./reporting/linker";
import pkg from "../package.json";

interface CliOptions {
  defFiles: string[];
  output?: string;
  tsconfig?: string;
  enableLogs: boolean;
  verbose: boolean;
  dryRun: boolean;
}

const argv = yargs(hideBin(process.argv))
  .usage("Usage: dart_bindgen [options]")
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
    describe: "Output directory",
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
  .option("tsconfig", {
    alias: "p",
    type: "string",
    describe: "Path to tsconfig.json for module resolution (handles pnpm, node_modules, etc.)",
  })
  .example('dart_bindgen -d "**/*.d.ts"', "Process all .d.ts files recursively")
  .example(
    'dart_bindgen -d "src/*.d.ts" -d "lib/*.d.ts" -o ./output',
    "Multiple patterns with custom output",
  )
  .example(
    'dart_bindgen --def-files "types/**/*.d.ts" -lv',
    "Enable logs and print the detailed linker report",
  )
  .help()
  .alias("help", "h")
  .version(pkg.version)
  .parseSync() as CliOptions;

async function main(options: CliOptions): Promise<void> {
  const startTime = Date.now();
  const logsEnabled = options.enableLogs || options.verbose;

  try {
    // Separate explicit paths from glob patterns
    // Explicit paths (no glob chars) bypass the node_modules ignore,
    // allowing users to target files in node_modules/@types/ directly.
    const isGlobPattern = (p: string) => /[*?{}[\]]/.test(p);
    const explicitPaths = options.defFiles.filter((p) => !isGlobPattern(p));
    const globPatterns = options.defFiles.filter((p) => isGlobPattern(p));

    // Resolve explicit paths to absolute
    const explicitAbsolute = explicitPaths.map((p) =>
      path.resolve(process.cwd(), p),
    );

    // Run fast-glob only on glob patterns (with node_modules ignore)
    const globFiles =
      globPatterns.length > 0
        ? await fg(globPatterns, {
          onlyFiles: true,
          absolute: true,
          ignore: ["node_modules/**", "*.min.d.ts"],
          caseSensitiveMatch: false,
        })
        : [];

    const files = [...new Set([...explicitAbsolute, ...globFiles])];

    const dtsFiles = files.filter((file) => file.endsWith(".d.ts"));

    if (logsEnabled) {
      console.log(`Patterns: ${options.defFiles.join(", ")}`);
      console.log(`Found ${dtsFiles.length} .d.ts files`);
    }

    if (dtsFiles.length === 0) {
      console.error("No .d.ts files found matching patterns");
      process.exit(1);
    }

    const validFiles = await Promise.all(
      dtsFiles.map(async (file) => {
        try {
          await fsPromises.access(file, fsConstants.R_OK);
          return file;
        } catch {
          if (logsEnabled) console.warn(`Cannot read: ${file}`);
          return null;
        }
      }),
    );

    const readableFiles = validFiles.filter((f): f is string => Boolean(f));

    if (logsEnabled || options.dryRun) {
      console.log("\nFiles to process:");
      readableFiles.forEach((file, i) => {
        const relative = path.relative(process.cwd(), file);
        console.log(`  ${i + 1}. ${relative}`);
      });
    }

    if (options.dryRun) {
      console.log(
        `\nDry run complete. Would process ${readableFiles.length} files.`,
      );
      return;
    }

    console.log("\nProcessing files...");
    await processFiles(readableFiles, options);

    const duration = Date.now() - startTime;
    console.log(`Completed in ${duration}ms`);
  } catch (error: any) {
    console.error("Error:", error.message || error);
    process.exit(1);
  }
}

async function processFiles(
  files: string[],
  options: CliOptions,
): Promise<void> {
  console.log(`Processing ${files.length} files to ${options.output}`);

  let transpilerOptions: TranspilerOptions = {
    files: files,
    outDir: options.output,
    debug: options.enableLogs || options.verbose,
    tsConfigFilePath: options.tsconfig
      ? path.resolve(process.cwd(), options.tsconfig)
      : undefined,
  };
  let transpiler: Transpiler = new Transpiler(transpilerOptions);
  const report = await transpiler.transpile();
  if (options.verbose) {
    console.log(formatVerboseLinkReport(report.analysis.link));
  }
  const unresolved = report.analysis.resolution.unresolved.length;
  if (unresolved === 0) {
    console.log("Module resolution: 0 unresolved references");
  } else {
    console.warn(
      `⚠️  Module resolution: ${unresolved} unresolved reference(s); rerun with -l for resolution details or -lv for the full linker report`,
    );
  }
}

main(argv);
