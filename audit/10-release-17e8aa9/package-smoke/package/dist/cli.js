#!/usr/bin/env node
import {
  Transpiler
} from "./chunk-M36KI3RN.js";

// src/cli.ts
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import fg from "fast-glob";
import { promises as fsPromises, constants as fsConstants } from "fs";
import path from "path";

// src/reporting/linker.ts
function countBy(values) {
  const counts = /* @__PURE__ */ new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}
function formatCounts(counts) {
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => `${name}=${count}`).join(", ");
}
function formatFailure(fqn, result) {
  if (result.state !== "NotLinkedDirect" /* NotLinkedDirect */ && result.state !== "NotLinkedIndirect" /* NotLinkedIndirect */) {
    return null;
  }
  const failure = result.failure.kind === "missing" ? `missing ${result.failure.lookupFQN}` : `ambiguous ${result.failure.lookupFQN} (${result.failure.candidates.join(", ")})`;
  const via = result.state === "NotLinkedIndirect" /* NotLinkedIndirect */ ? ` via ${result.viaChain.join(" -> ")}` : "";
  return `  ! ${fqn}: ${result.state} \u2014 ${failure}${via}`;
}
function formatSemanticWarning(report) {
  const count = report.semantic.diagnostics.length;
  if (count === 0) return null;
  return `\u26A0\uFE0F  Semantic analysis: ${count} diagnostic(s); rerun with -lv for complete records`;
}
function formatVerboseLinkReport(report) {
  const resolvedEdges = report.edges.filter(
    (edge) => edge.resolution.kind === "resolved"
  );
  const missingEdges = report.edges.filter(
    (edge) => edge.resolution.kind === "missing"
  );
  const ambiguousEdges = report.edges.filter(
    (edge) => edge.resolution.kind === "ambiguous"
  );
  const states = countBy(
    [...report.results.values()].map((result) => result.state)
  );
  const strategies = countBy(
    resolvedEdges.map((edge) => {
      if (edge.resolution.kind !== "resolved") {
        throw new Error("Resolved-edge filter invariant failed");
      }
      return edge.resolution.strategy;
    })
  );
  const lines = [
    "\n\u{1F50E} Verbose linker report",
    `  Semantic bindings: ${report.semantic.inputDeclarations} input declarations, ${report.semantic.outputSymbols} output symbols, ${report.semantic.outputFacets} output facets`,
    `  Semantic changes: merges=${report.semantic.declarationGroupsMerged}, anonymous redirects=${report.semantic.anonymousSymbolsCanonicalized}, overloads=${report.semantic.overloadsRenamed}, keywords=${report.semantic.keywordRenames}, namespaces=${report.semantic.namespaceRenames}, dual facets=${report.semantic.dualFacetRenames}, globals=${report.semantic.globalDeclarationsHoisted}, augmentations suppressed=${report.semantic.externalAugmentationsSuppressed}`,
    `  Symbols: ${report.results.size} total, ${report.valid} valid, ${report.broken} broken`,
    `  States: ${formatCounts(states) || "none"}`,
    `  Edges: ${report.edges.length} total, ${resolvedEdges.length} resolved, ${missingEdges.length} missing, ${ambiguousEdges.length} ambiguous`,
    `  Resolution strategies: ${formatCounts(strategies) || "none"}`
  ];
  if (report.semantic.redirects.length > 0) {
    lines.push("  Semantic redirects:");
    for (const redirect of report.semantic.redirects) {
      lines.push(
        `  \u21AA ${redirect.fromFQN} -> ${redirect.toFQN} [${redirect.reason}]`
      );
    }
  }
  if (report.semantic.suppressedAugmentations.length > 0) {
    lines.push("  Suppressed external augmentations:");
    for (const augmentation of report.semantic.suppressedAugmentations) {
      lines.push(
        `  \u2298 ${augmentation.ownerFQN}: ${augmentation.moduleSpecifier} -> ${augmentation.canonicalTarget} [${augmentation.declarationKinds.join(", ")}]`
      );
    }
  }
  if (report.semantic.diagnostics.length > 0) {
    lines.push("  Semantic diagnostics:");
    for (const diagnostic of report.semantic.diagnostics) {
      lines.push(
        `  \u26A0 ${diagnostic.code} ${diagnostic.ownerFQN} [${diagnostic.action}]: ${diagnostic.message}`
      );
    }
  }
  if (report.edges.length > 0) {
    lines.push("  Edges:");
    for (const edge of report.edges) {
      if (edge.resolution.kind === "resolved") {
        lines.push(
          `  \u2713 ${edge.from} --${edge.writtenName}--> ${edge.resolution.fqn} [${edge.resolution.strategy}]`
        );
      } else if (edge.resolution.kind === "missing") {
        lines.push(
          `  \u2717 ${edge.from} --${edge.writtenName}--> ${edge.resolution.lookupFQN} [missing]`
        );
      } else {
        lines.push(
          `  ? ${edge.from} --${edge.writtenName}--> ${edge.resolution.lookupFQN} [ambiguous: ${edge.resolution.candidates.join(", ")}]`
        );
      }
    }
  }
  const failures = [...report.results.entries()].map(([fqn, result]) => formatFailure(fqn, result)).filter((line) => line !== null);
  if (failures.length > 0) {
    lines.push("  Broken symbols:", ...failures);
  }
  if (report.diagnostics.length > 0) {
    lines.push("  Checker fallbacks:");
    for (const diagnostic of report.diagnostics) {
      lines.push(
        `  \u26A0 ${diagnostic.ownerFQN} --${diagnostic.writtenName}: ${diagnostic.message}`
      );
    }
  }
  return lines.join("\n");
}

// package.json
var package_default = {
  name: "dart_bindgen",
  version: "1.0.0",
  description: "A modern, type-safe code generator to create Dart JS-interop bindings from TypeScript .d.ts files.",
  main: "dist/cli.js",
  bin: {
    dart_bindgen: "dist/cli.js"
  },
  files: [
    "dist"
  ],
  repository: {
    type: "git",
    url: "git+https://github.com/codewithsam110g/dartify.git"
  },
  scripts: {
    dev: "tsx src/cli.ts",
    graph: "tsx tools/graph.ts",
    ir: "tsx tools/ir.ts",
    bench: "tsx tools/bench.ts",
    build: "tsup src/cli.ts --format esm --target node20 --out-dir dist --clean",
    test: "vitest run",
    "test:run": "vitest run",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:update": "vitest run -u",
    "test:stress": "DARTIFY_STRESS=1 vitest run test/stress.test.ts",
    "test:s2": "DARTIFY_S2_CORPUS=1 vitest run test/linker/corpus.test.ts",
    "test:s3": "DARTIFY_S3_CORPUS=1 vitest run test/decl/corpus.test.ts",
    "test:s4": "vitest run test/linker/symbol-table.test.ts test/linker/semantic.test.ts test/linker/reporting.test.ts test/decl/decl-emitter.test.ts",
    "test:s5:fixture": "vitest run test/decl/s5-emitter-fixture.test.ts",
    "test:dart": "DARTIFY_DART=1 vitest run test/dart/dart-gate.test.ts",
    "test:e2e": "DARTIFY_E2E=1 vitest run test/e2e/e2e.test.ts",
    "test:incremental": "DARTIFY_INCREMENTAL=1 vitest run test/watch.test.ts test/watch-differential.test.ts",
    "fixture:s5": 'tsx src/cli.ts -d "def_files/synthetic/s5_emitter/*.d.ts" -o output/s5_emitter -lv',
    "test:coverage": "vitest run --coverage",
    "test:debug": "vitest --inspect-brk --no-coverage --reporter=verbose",
    "test:cli": 'pnpm build && node dist/cli.js -d "def_files/h3/h3.d.ts" -o ./output',
    clean: "rm -rf dist output",
    prepublishOnly: "pnpm build"
  },
  type: "module",
  keywords: [
    "typescript",
    "dart",
    "interop",
    "codegen",
    "flutter",
    "bindings",
    "js_facade_gen",
    "js_interop",
    "dts",
    "bindgen"
  ],
  author: "Samba Siva Rao Kovvuru <codewithsam110g>",
  license: "Apache-2.0",
  engines: {
    node: "^20.19.0 || ^22.12.0 || >=23"
  },
  packageManager: "pnpm@10.9.0",
  dependencies: {
    "fast-glob": "^3.3.3",
    "ts-morph": "^28.0.0",
    yargs: "^18.0.0"
  },
  devDependencies: {
    "@types/node": "^24.0.3",
    "@types/yargs": "^17.0.33",
    "@vitest/coverage-v8": "3.2.4",
    "@vitest/ui": "^3.2.4",
    "@viz-js/viz": "^3.27.0",
    "h3-js": "4.4.0",
    jsdom: "26.1.0",
    leaflet: "1.9.4",
    three: "0.180.0",
    tsup: "^8.5.0",
    tsx: "^4.20.3",
    typescript: "^5.8.3",
    "vite-tsconfig-paths": "^5.1.4",
    vitest: "^3.2.4"
  }
};

// src/cli.ts
var argv = yargs(hideBin(process.argv)).usage("Usage: dart_bindgen [options]").option("def-files", {
  alias: "d",
  type: "array",
  describe: "TypeScript definition files or glob patterns",
  demandOption: true,
  coerce: (arg) => Array.isArray(arg) ? arg : [arg]
}).option("output", {
  alias: "o",
  type: "string",
  describe: "Output directory"
}).option("enable-logs", {
  alias: "l",
  type: "boolean",
  describe: "Enable phase and module-resolution logging",
  default: false
}).option("verbose", {
  alias: "v",
  type: "boolean",
  describe: "Show detailed structured linker diagnostics (implies -l)",
  default: false
}).option("dry-run", {
  type: "boolean",
  describe: "Show what would be processed without doing it",
  default: false
}).option("watch", {
  alias: "w",
  type: "boolean",
  describe: "Rebuild incrementally whenever an input changes",
  default: false
}).option("js-root", {
  type: "string",
  describe: "Global that module libraries are reached through (e.g. THREE)"
}).option("tsconfig", {
  alias: "p",
  type: "string",
  describe: "Path to tsconfig.json for module resolution (handles pnpm, node_modules, etc.)"
}).example('dart_bindgen -d "**/*.d.ts"', "Process all .d.ts files recursively").example(
  'dart_bindgen -d "src/*.d.ts" -d "lib/*.d.ts" -o ./output',
  "Multiple patterns with custom output"
).example(
  'dart_bindgen --def-files "types/**/*.d.ts" -lv',
  "Enable logs and print the detailed linker report"
).example('dart_bindgen -d "types/**/*.d.ts" -o ./generated -w', "Watch and rebuild on change").help().alias("help", "h").version(package_default.version).parseSync();
async function main(options) {
  const startTime = Date.now();
  const logsEnabled = options.enableLogs || options.verbose;
  try {
    const isGlobPattern = (p) => /[*?{}[\]]/.test(p);
    const explicitPaths = options.defFiles.filter((p) => !isGlobPattern(p));
    const globPatterns = options.defFiles.filter((p) => isGlobPattern(p));
    const explicitAbsolute = explicitPaths.map(
      (p) => path.resolve(process.cwd(), p)
    );
    const globFiles = globPatterns.length > 0 ? await fg(globPatterns, {
      onlyFiles: true,
      absolute: true,
      ignore: ["node_modules/**", "*.min.d.ts"],
      caseSensitiveMatch: false
    }) : [];
    const files = [.../* @__PURE__ */ new Set([...explicitAbsolute, ...globFiles])];
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
      })
    );
    const readableFiles = validFiles.filter((f) => Boolean(f));
    if (logsEnabled || options.dryRun) {
      console.log("\nFiles to process:");
      readableFiles.forEach((file, i) => {
        const relative = path.relative(process.cwd(), file);
        console.log(`  ${i + 1}. ${relative}`);
      });
    }
    if (options.dryRun) {
      console.log(
        `
Dry run complete. Would process ${readableFiles.length} files.`
      );
      return;
    }
    if (options.watch) {
      await watchFiles(readableFiles, options);
      return;
    }
    console.log("\nProcessing files...");
    await processFiles(readableFiles, options);
    const duration = Date.now() - startTime;
    console.log(`Completed in ${duration}ms`);
  } catch (error) {
    console.error("Error:", error.message || error);
    process.exit(1);
  }
}
async function processFiles(files, options) {
  console.log(`Processing ${files.length} files to ${options.output}`);
  let transpilerOptions = {
    files,
    outDir: options.output,
    debug: options.enableLogs || options.verbose,
    tsConfigFilePath: options.tsconfig ? path.resolve(process.cwd(), options.tsconfig) : void 0,
    ...options.jsRoot ? { jsRoot: options.jsRoot } : {}
  };
  let transpiler = new Transpiler(transpilerOptions);
  const report = await transpiler.transpile();
  const semanticWarning = formatSemanticWarning(report.analysis.link);
  if (semanticWarning) console.warn(semanticWarning);
  if (options.verbose) {
    console.log(formatVerboseLinkReport(report.analysis.link));
  }
  const backendDiagnostics = [...report.files.values()].flatMap((file) => file.diagnostics);
  const exportDiagnostics = report.analysis.link.moduleExportDiagnostics;
  const emitted = backendDiagnostics.length + exportDiagnostics.length;
  if (emitted > 0) {
    console.warn(
      `\u26A0\uFE0F  Emission: ${emitted} diagnostic(s)${options.verbose ? "" : "; rerun with -lv for complete records"}`
    );
    if (options.verbose) {
      for (const diagnostic of backendDiagnostics) {
        console.warn(`  [${diagnostic.code}] ${diagnostic.message}`);
      }
      for (const diagnostic of exportDiagnostics) {
        console.warn(`  [${diagnostic.code}] ${diagnostic.file}:${diagnostic.line} ${diagnostic.message}`);
      }
    }
  }
  const unresolved = report.analysis.resolution.unresolved.length;
  if (unresolved === 0) {
    console.log("Module resolution: 0 unresolved references");
  } else {
    console.warn(
      `\u26A0\uFE0F  Module resolution: ${unresolved} unresolved reference(s); rerun with -l for resolution details or -lv for the full linker report`
    );
  }
}
async function watchFiles(files, options) {
  const { WatchSession } = await import("./watch-MMLOTDRB.js");
  const { watch } = await import("fs");
  const session = new WatchSession({
    files,
    outDir: options.output,
    tsConfigFilePath: options.tsconfig ? path.resolve(process.cwd(), options.tsconfig) : void 0,
    ...options.jsRoot ? { jsRoot: options.jsRoot } : {}
  });
  const report = (label, build) => {
    const failures = build.analysis.generation.length;
    const status = failures > 0 ? `\u26A0\uFE0F  ${failures} generation error(s); nothing written` : `wrote ${build.written.length}`;
    console.log(
      `${label}: ${build.files.size} libraries, rebuilt ${build.rebuilt.length} source file(s), ${status} \u2014 ${build.timings.total} ms`
    );
  };
  report("Initial build", await session.build());
  await session.build([files[0]]);
  const roots = [...new Set(files.map((file) => path.dirname(file)))];
  const root = roots.reduce((common, directory) => {
    while (!directory.startsWith(common)) common = path.dirname(common);
    return common;
  });
  const pending = /* @__PURE__ */ new Set();
  let timer;
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
    if (!fileName || !fileName.toString().endsWith(".ts")) return;
    pending.add(path.resolve(root, fileName.toString()));
    clearTimeout(timer);
    timer = setTimeout(flush, 25);
  });
  console.log(`Watching ${path.relative(process.cwd(), root) || "."} for changes (Ctrl+C to stop)`);
  await new Promise(() => void 0);
}
main(argv);
