/**
 * Phase 3: Emission
 * Groups symbols from the global SymbolTable by source file,
 * derives output paths from FQN, generates Dart file headers,
 * and delegates to the existing per-kind emitters.
 */

import { writeFile, mkdir } from "fs/promises";
import { basename, dirname, extname, join, relative } from "path";
import { transpilerContext } from "@/context";
import { Symbol, SymbolType } from "@/symbol";
import {
    IRClass,
    IRDeclaration,
    IREnum,
    IRFunction,
    IRInterface,
    IRTypeAlias,
    IRVariable,
    IRDeclKind,
} from "@ir/index";
import * as emitter from "@emitter/old/index";
import { TranspileException } from "@/transpiler";

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
}

/**
 * Renders the whole symbol table to Dart source, in memory.
 *
 * This is the pure half of the emission phase: it touches no filesystem, so it
 * can be called from tests, from `Transpiler.transpileFromString`, or by any
 * consumer that wants the output without writing it (E-11).
 *
 * @param outDir     Root output directory (used only to derive paths)
 * @param inputRoot  Common root of all input files
 * @param debug      Whether to log emission details
 */
export function renderAllFiles(
    outDir: string,
    inputRoot: string,
    debug: boolean,
): Map<string, RenderedFile> {
    const table = transpilerContext.symbolTable.getSymbolTable();

    // 1. Group all symbols by their source .d.ts file
    const fileGroups = groupSymbolsByFile(table);

    // 2. Render each file group into Dart source
    const rendered = new Map<string, RenderedFile>();
    for (const [sourceFile, symbols] of fileGroups) {
        const outputPath = deriveOutputPath(sourceFile, inputRoot, outDir);
        rendered.set(outputPath, {
            sourceFile,
            outputPath,
            content: emitFileContent(sourceFile, symbols, debug),
            symbolCount: symbols.length,
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
        // Create parent directories if they don't exist
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
 * Top-level entry point for the emission phase: render, then write.
 *
 * @param outDir     Root output directory
 * @param inputRoot  Common root of all input files (used to derive relative paths)
 * @param debug      Whether to log emission details
 */
export async function emitAllFiles(
    outDir: string,
    inputRoot: string,
    debug: boolean,
): Promise<void> {
    const rendered = renderAllFiles(outDir, inputRoot, debug);
    await writeAllFiles(rendered, debug);

    if (debug) {
        console.log(`\n✅ Emitted ${rendered.size} Dart file(s) to ${outDir}`);
    }
}

/**
 * Groups a flat symbol table into a Map<sourceFilePath, Symbol[]>.
 * The source file is extracted from the FQN (everything before "::").
 */
function groupSymbolsByFile(
    table: Map<string, Symbol[]>,
): Map<string, Symbol[]> {
    const groups = new Map<string, Symbol[]>();

    for (const [, symbols] of table) {
        for (const symbol of symbols) {
            const sourceFile = extractSourceFile(symbol.fqn);
            const existing = groups.get(sourceFile) || [];
            existing.push(symbol);
            groups.set(sourceFile, existing);
        }
    }

    return groups;
}

/**
 * Extracts the source file path from a FQN.
 * FQN format: "/abs/path/to/file.d.ts::scopePath|declName"
 */
function extractSourceFile(fqn: string): string {
    const sepIndex = fqn.indexOf("::");
    if (sepIndex === -1) return fqn;
    return fqn.substring(0, sepIndex);
}

/**
 * Extracts the JS module prefix from the FQN scope path for @JS() annotations.
 * FQN: "file.d.ts::"h3"|isValidCell" → scope = '"h3"|isValidCell'
 * We strip the declaration name (last segment after |) and convert | to .
 *
 * Examples:
 *   '"h3"|isValidCell'     → 'h3.'
 *   '"h3"|UNITS|m'         → 'h3.UNITS.'
 *   'isValidCell'          → '' (no module)
 *   ''                     → '' (global scope)
 */
function extractJsPrefix(fqn: string): string {
    const sepIndex = fqn.indexOf("::");
    if (sepIndex === -1) return "";

    const scopePath = fqn.substring(sepIndex + 2);
    const segments = scopePath.split("|");

    // Remove the last segment (the declaration name itself)
    segments.pop();

    if (segments.length === 0) return "";

    // Strip quotes from module names and join with dots
    return (
        segments
            .map((s) => s.replace(/['"]/g, ""))
            .join(".") + "."
    );
}

/**
 * Derives the output .dart file path from the source .d.ts file path.
 * Mirrors the input filesystem tree under outDir.
 */
function deriveOutputPath(
    sourceFile: string,
    inputRoot: string,
    outDir: string,
): string {
    // Get relative path from the input root
    let relPath = relative(inputRoot, sourceFile);

    // Strip leading "../" or "..\" segments so dep files outside the inputRoot
    // don't escape outDir. e.g. "../../serve-static/index.d.ts" → "serve-static/index.d.ts"
    const segments = relPath.split(/[\\/]/);
    while (segments.length > 0 && (segments[0] === ".." || segments[0] === ".")) {
        segments.shift();
    }
    relPath = segments.join("/");

    // Convert .d.ts → .dart (or .ts → .dart)
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

/**
 * Generates the Dart library name from a source file path.
 * Strips the extension and sanitizes to a valid Dart identifier.
 */
function deriveDartLibraryName(sourceFile: string): string {
    let fileName = basename(sourceFile);

    if (fileName.endsWith(".d.ts")) {
        fileName = fileName.slice(0, -5);
    } else if (fileName.endsWith(".ts")) {
        fileName = fileName.slice(0, -3);
    } else {
        fileName = fileName.replace(extname(fileName), "");
    }

    return fileName.replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * Generates the full Dart file content for a single source file's symbols.
 */
function emitFileContent(
    sourceFile: string,
    symbols: Symbol[],
    debug: boolean,
): string {
    const parts: string[] = [];
    const libraryName = deriveDartLibraryName(sourceFile);
    const fileName = basename(sourceFile);

    // Header
    parts.push(`// Generated by dart_bindgen from ${fileName}`);
    parts.push(`// Do not edit directly`);
    parts.push(``);
    parts.push(`@JS()`);
    parts.push(`library ${libraryName};`);
    parts.push(``);
    parts.push(`import 'package:js/js.dart';`);
    parts.push(``);

    // Minted typedefs are collected into their own section rather than left
    // interleaved with the translated declarations (`E-16`). They are not
    // things the author wrote, and a reader scanning the bindings for the API
    // should not have to step over dartify's bookkeeping to find it.
    const declared = symbols.filter((s) => !s.minted);
    const minted = symbols
        .filter((s) => s.minted)
        .sort((a, b) => a.fqn.localeCompare(b.fqn));

    const emit = (symbol: Symbol) => {
        try {
            const jsPrefix = extractJsPrefix(symbol.fqn);
            const code = emitSymbol(symbol, jsPrefix, debug);
            if (code) {
                parts.push(code);
                parts.push(""); // blank line between declarations
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            parts.push(`// ERROR emitting ${symbol.fqn}: ${msg}`);
        }
    };

    declared.forEach(emit);

    if (minted.length > 0) {
        parts.push(TYPE_DEFINITIONS_HEADER);
        parts.push("");
        minted.forEach(emit);
    }

    return parts.join("\n");
}

const TYPE_DEFINITIONS_HEADER = [
    "// " + "-".repeat(75),
    "// Type definitions",
    "//",
    "// TypeScript constructs with no Dart representation. Each one is `dynamic`",
    "// with its original spelling recorded, so the degradation is stated once and",
    "// every use site refers to it by name. Replacing a `dynamic` here upgrades",
    "// every use site at once.",
    "// " + "-".repeat(75),
].join("\n");

/**
 * Dispatches a single Symbol to the appropriate emitter function.
 */
function emitSymbol(
    symbol: Symbol,
    jsPrefix: string,
    debug: boolean,
): string {
    const decl = symbol.ir;

    switch (decl.kind) {
        case IRDeclKind.Interface:
            return emitter.emitInterface(decl as IRInterface, jsPrefix, debug);

        case IRDeclKind.Class:
            return emitter.emitClass(decl as IRClass, jsPrefix, debug);

        case IRDeclKind.Function:
            return emitter.emitFunction(decl as IRFunction, jsPrefix, debug);

        case IRDeclKind.Variable:
            return emitter.emitVariable(decl as IRVariable, jsPrefix, debug);

        case IRDeclKind.TypeAlias:
            return emitter.emitTypeAlias(decl as IRTypeAlias, jsPrefix, debug);

        case IRDeclKind.Enum:
            return emitter.emitEnum(decl as IREnum, jsPrefix, debug);

        default:
            throw new TranspileException(
                `Unsupported declaration kind for emission: ${decl.kind}`,
                "UNSUPPORTED_EMISSION_KIND",
            );
    }
}
