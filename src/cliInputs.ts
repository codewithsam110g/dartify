/**
 * Turns the command line's input arguments into the list of declaration files
 * to generate from, or into named errors (HD-04). Input is declaration files
 * only (D-08): an explicit path that is not one is an error, never a silent
 * skip, and so is a missing or unreadable one.
 */
import fg from "fast-glob";
import { promises as fsPromises, constants as fsConstants } from "fs";
import path from "path";
import {
  DECLARATION_SUFFIXES,
  isDeclarationFileName,
  stripDeclarationSuffix,
} from "./resolution/declarationFile";
import { displayPath } from "./reporting/path";

export interface InputSelection {
  /** Absolute paths, explicit inputs first, then glob matches. */
  files: string[];
  /** Reasons to stop before generating: every bad explicit input, every output collision. */
  errors: string[];
  /** Patterns that matched nothing; the run continues. */
  warnings: string[];
  /** Inputs deliberately left out (dual-package typings). */
  notices: string[];
}

const DECLARATION_LIST = DECLARATION_SUFFIXES.join(", ").replace(/, ([^,]*)$/, " or $1");

/**
 * A pattern, as opposed to a path. Explicit paths bypass the `node_modules`
 * ignore so `node_modules/@types/...` can be targeted directly.
 */
export function isGlobPattern(input: string): boolean {
  return input.startsWith("!") || /[*?{}[\]]/.test(input);
}

async function checkExplicitInput(raw: string, cwd: string): Promise<{ file: string } | { error: string }> {
  const file = path.resolve(cwd, raw);
  let stats;
  try {
    stats = await fsPromises.stat(file);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === "ENOENT" || code === "ENOTDIR"
      ? { error: `Input not found: ${raw}` }
      : { error: `Input cannot be read: ${raw} (${code ?? "unknown error"})` };
  }
  if (stats.isDirectory()) {
    return { error: `Input is a directory, not a declaration file: ${raw}` };
  }
  if (!stats.isFile()) {
    return { error: `Input is not a regular file: ${raw}` };
  }
  if (!isDeclarationFileName(file)) {
    return { error: `Input is not a declaration file (expected ${DECLARATION_LIST}): ${raw}` };
  }
  try {
    await fsPromises.access(file, fsConstants.R_OK);
  } catch {
    return { error: `Input is not readable: ${raw}` };
  }
  return { file };
}

/**
 * Collects the inputs named by `patterns`: explicit paths and fast-glob
 * patterns, as the CLI's `-d` and positional arguments give them.
 */
export async function collectInputs(
  patterns: readonly string[],
  cwd: string = process.cwd(),
): Promise<InputSelection> {
  const explicit = [...new Set(patterns.filter((pattern) => !isGlobPattern(pattern)))];
  const globs = patterns.filter(isGlobPattern);
  const positives = globs.filter((pattern) => !pattern.startsWith("!"));
  const negatives = globs.filter((pattern) => pattern.startsWith("!"));

  const errors: string[] = [];
  const warnings: string[] = [];
  const notices: string[] = [];

  const explicitFiles = new Set<string>();
  for (const result of await Promise.all(explicit.map((raw) => checkExplicitInput(raw, cwd)))) {
    if ("error" in result) errors.push(result.error);
    else explicitFiles.add(result.file);
  }

  // One scan per pattern, each with every negation applied, so a pattern that
  // matched nothing can be named. The union equals one scan of all of them.
  const globFiles = new Set<string>();
  for (const pattern of positives) {
    const matches = (
      await fg([pattern, ...negatives], {
        cwd,
        onlyFiles: true,
        absolute: true,
        ignore: ["node_modules/**", "*.min.d.ts"],
        caseSensitiveMatch: false,
      })
    )
      .map((match) => path.resolve(match))
      .filter(isDeclarationFileName);
    if (matches.length === 0) {
      warnings.push(`Pattern matched no declaration files (${DECLARATION_LIST}): ${pattern}`);
    }
    for (const match of matches) globFiles.add(match);
  }

  const chosen = new Set([...explicitFiles, ...globFiles]);

  // Dual-package typings: `x.d.ts`, `x.d.mts` and `x.d.cts` describe one API
  // and would all be written to `x.dart`. When the `.d.ts` is an input too, a
  // *glob-matched* sibling is dropped rather than reported as a collision. An
  // explicit one never is: the user named it.
  for (const file of globFiles) {
    if (explicitFiles.has(file) || file.endsWith(".d.ts")) continue;
    const sibling = `${stripDeclarationSuffix(file)}.d.ts`;
    if (!chosen.has(sibling)) continue;
    chosen.delete(file);
    notices.push(
      `Skipping ${displayPath(file, cwd)}: ${displayPath(sibling, cwd)} describes the same API`,
    );
  }

  const byOutput = new Map<string, string[]>();
  for (const file of chosen) {
    const output = `${stripDeclarationSuffix(file)}.dart`;
    byOutput.set(output, [...(byOutput.get(output) ?? []), file]);
  }
  for (const [output, owners] of byOutput) {
    if (owners.length < 2) continue;
    errors.push(
      `Inputs ${owners.map((file) => displayPath(file, cwd)).sort().join(" and ")} would all be written to ${displayPath(output, cwd)}; pass only one of them`,
    );
  }

  return { files: [...chosen], errors, warnings, notices };
}
