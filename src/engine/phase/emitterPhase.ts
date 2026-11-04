/**
 * Phase 3: Emission.
 *
 * Groups the linked program's symbols by source file, derives output paths,
 * and hands each library to a `Backend`. The default backend is `package:js`
 * (v1); the phase itself is target-agnostic.
 */

import { writeFile, mkdir } from "fs/promises";
import { dirname, extname, join, relative } from "path";
import { Symbol } from "@/symbol";
import { sourceFileOfFQN } from "@/symbol/fqn";
import { TranspileException } from "@/transpiler";
import {
  Backend,
  BackendDiagnostic,
  RenderSession,
  SUPPORT_LIBRARY,
} from "@emitter/backend";
import { createPackageJsBackend } from "@emitter/packagejs/index";
import { SUPPORT_FILE_NAME } from "@emitter/packagejs/support";
import { LinkedProgram } from "./linkerPhase";

/**
 * One rendered Dart file, before it touches the filesystem.
 */
export interface RenderedFile {
  /** Absolute path of the originating .d.ts file */
  sourceFile: string;
  /** Path the file would be written to under outDir */
  outputPath: string;
  /** The complete Dart source */
  content: string;
  /** How many symbols contributed to it */
  symbolCount: number;
  /** Backend facts about declarations it could not bind faithfully. */
  diagnostics: BackendDiagnostic[];
}

/**
 * Renders the whole linked program to Dart source, in memory (`E-11`).
 *
 * A file renders when it emits at least one declaration or re-exports another
 * rendered file, so barrel files become Dart `export` libraries.
 */
export function renderAllFiles(
  program: LinkedProgram,
  outDir: string,
  inputRoot: string,
  debug = false,
  backend: Backend = createPackageJsBackend(),
  session?: RenderSession,
): Map<string, RenderedFile> {
  const fileGroups = groupSymbolsByFile(program.symbols);

  const emitting = new Set(
    [...fileGroups]
      .filter(([, symbols]) =>
        symbols.some((symbol) => symbol.facets.some((facet) => facet.emit)),
      )
      .map(([file]) => file),
  );
  // Barrels: files whose only content is re-exports of rendered files,
  // possibly through other barrels.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [file, records] of program.moduleExports.byFile) {
      if (emitting.has(file)) continue;
      const reexportsRendered = records.some(
        (record) =>
          (record.kind === "star" || record.kind === "named") &&
          record.targetFile !== undefined &&
          emitting.has(record.targetFile),
      );
      if (reexportsRendered) {
        emitting.add(file);
        changed = true;
      }
    }
  }

  const outputPathOfFile = new Map<string, string>();
  const ownerOfOutput = new Map<string, string>();
  for (const file of [...emitting].sort()) {
    const outputPath = deriveOutputPath(file, inputRoot, outDir);
    const collision = ownerOfOutput.get(outputPath);
    if (collision) {
      throw new TranspileException(
        `Output path collision: ${collision} and ${file} both map to ${outputPath}`,
        "OUTPUT_PATH_COLLISION",
        file,
      );
    }
    ownerOfOutput.set(outputPath, file);
    outputPathOfFile.set(file, outputPath);
  }

  // Several libraries share one runtime-support library (`E-40`); a single
  // library stays self-contained. The name avoids every generated path.
  let supportPath: string | undefined;
  if (outputPathOfFile.size > 1) {
    supportPath = join(outDir, SUPPORT_FILE_NAME);
    while (ownerOfOutput.has(supportPath)) supportPath = supportPath.replace(/\.dart$/, "_.dart");
  }

  const libraries = backend.renderLibraries(
    [...outputPathOfFile].map(([sourceFile, outputPath]) => ({
      program,
      sourceFile,
      outputPath,
      outputPathOfFile,
      symbols: fileGroups.get(sourceFile) ?? [],
      moduleExports: program.moduleExports.byFile.get(sourceFile) ?? [],
      ...(supportPath ? { supportPath } : {}),
    })),
    session,
  );
  const rendered = new Map<string, RenderedFile>();
  for (const [sourceFile, outputPath] of outputPathOfFile) {
    const symbols = fileGroups.get(sourceFile) ?? [];
    const library = libraries.get(sourceFile)!;
    rendered.set(outputPath, {
      sourceFile,
      outputPath,
      content: library.content,
      symbolCount: symbols.reduce(
        (count, symbol) => count + symbol.facets.filter((facet) => facet.emit).length,
        0,
      ),
      diagnostics: library.diagnostics,
    });
    if (debug && library.diagnostics.length > 0) {
      console.log(`  ⚠️  ${outputPath}: ${library.diagnostics.length} backend diagnostic(s)`);
    }
  }
  const support = libraries.get(SUPPORT_LIBRARY);
  if (support && supportPath) {
    rendered.set(supportPath, {
      sourceFile: SUPPORT_FILE_NAME,
      outputPath: supportPath,
      content: support.content,
      symbolCount: 0,
      diagnostics: [],
    });
  }
  return rendered;
}

/**
 * Writes rendered files to disk. The impure half of the emission phase.
 */
export async function writeAllFiles(
  files: Map<string, RenderedFile>,
  debug: boolean,
): Promise<void> {
  for (const [outputPath, file] of files) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, file.content, "utf-8");

    if (debug) {
      console.log(
        `  📝 ${file.sourceFile} → ${outputPath} (${file.symbolCount} symbols)`,
      );
    }
  }
}

/**
 * Groups a flat symbol table by source file, preserving table order within a
 * file and sorting files.
 */
function groupSymbolsByFile(
  table: ReadonlyMap<string, readonly Symbol[]>,
): Map<string, Symbol[]> {
  const groups = new Map<string, Symbol[]>();
  for (const [, symbols] of table) {
    for (const symbol of symbols) {
      const sourceFile = sourceFileOfFQN(symbol.fqn);
      const existing = groups.get(sourceFile) || [];
      existing.push(symbol);
      groups.set(sourceFile, existing);
    }
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Derives the output .dart file path from the source .d.ts file path,
 * mirroring the input tree under outDir.
 */
function deriveOutputPath(
  sourceFile: string,
  inputRoot: string,
  outDir: string,
): string {
  let relPath = relative(inputRoot, sourceFile);

  // Strip leading "../" so dependency files outside inputRoot stay in outDir.
  const segments = relPath.split(/[\\/]/);
  while (segments.length > 0 && (segments[0] === ".." || segments[0] === ".")) {
    segments.shift();
  }
  relPath = segments.join("/");

  let dartPath: string;
  if (relPath.endsWith(".d.ts")) {
    dartPath = relPath.slice(0, -5) + ".dart";
  } else if (relPath.endsWith(".ts")) {
    dartPath = relPath.slice(0, -3) + ".dart";
  } else {
    dartPath = relPath.replace(extname(relPath), ".dart");
  }

  return join(outDir, dartPath);
}
