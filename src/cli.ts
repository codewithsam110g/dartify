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
import { Transpiler, TranspilerOptions } from "./main";

interface CliOptions {
  defFiles: string[];
  output?: string;
  enableLogs: boolean;
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
    describe: "Enable verbose logging",
    default: false,
  })
  .option("dry-run", {
    type: "boolean",
    describe: "Show what would be processed without doing it",
    default: false,
  })
  .example('dart_bindgen -d "**/*.d.ts"', "Process all .d.ts files recursively")
  .example(
    'dart_bindgen -d "src/*.d.ts" -d "lib/*.d.ts" -o ./output',
    "Multiple patterns with custom output",
  )
  .example(
    'dart_bindgen --def-files "types/**/*.d.ts" --enable-logs',
    "Enable Logging and Writing IR files to Disk",
  )
  .help()
  .alias("help", "h")
  .version("v0.3")
  .alias("version", "v")
  .parseSync() as CliOptions;

async function main(options: CliOptions): Promise<void> {
  const startTime = Date.now();

  try {
    const files = await fg(options.defFiles, {
      onlyFiles: true,
      absolute: true,
      ignore: ["node_modules/**", "*.min.d.ts"],
      caseSensitiveMatch: false,
    });

    const dtsFiles = files.filter((file) => file.endsWith(".d.ts"));

    if (options.enableLogs) {
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
          if (options.enableLogs) console.warn(`Cannot read: ${file}`);
          return null;
        }
      }),
    );

    const readableFiles = validFiles.filter((f): f is string => Boolean(f));

    if (options.enableLogs || options.dryRun) {
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
    debug: options.enableLogs,
  };
  let transpiler: Transpiler = new Transpiler(transpilerOptions);
  await transpiler.transpile();
}

main(argv);
