/**
 * Command-line options after yargs, and the js_facade_gen invocation mapping
 * (HD-14): positional inputs are `-d`, `--destination` is `-o`, `--base-path`
 * sets the output root, and the flags that changed js_facade_gen's output are
 * refused with what dartify does instead.
 */

/** The parsed arguments this module reads (yargs' camel-cased names). */
export interface ParsedArgs {
  defFiles?: readonly (string | number)[];
  inputs?: readonly (string | number)[];
  /** `-o`, `--output` and `--destination`; yargs gives an array when repeated. */
  output?: string | readonly string[];
  basePath?: string | readonly string[];
  tsconfig?: string;
  enableLogs?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  watch?: boolean;
  jsRoot?: string;
  skipFormatting?: boolean;
  generateHtml?: boolean;
  renameConflictingTypes?: boolean;
  explicitStatic?: boolean;
  trustJsTypes?: boolean;
}

export interface CliOptions {
  /** `-d` values, then positional arguments: files and glob patterns. */
  inputs: string[];
  output?: string;
  basePath?: string;
  tsconfig?: string;
  enableLogs: boolean;
  verbose: boolean;
  dryRun: boolean;
  watch: boolean;
  jsRoot?: string;
  /**
   * Positional inputs without a destination: the single resulting library is
   * printed to stdout, as js_facade_gen's basic usage did.
   */
  toStdout: boolean;
}

/** A command line that cannot be run; `main` prints each message and exits 1. */
export class CliUsageError extends Error {
  constructor(public readonly messages: readonly string[]) {
    super(messages.join("\n"));
    this.name = "CliUsageError";
  }
}

/**
 * js_facade_gen flags dartify does not implement. Each message states what
 * dartify does instead, read off the code: platform types map to `dart:html`
 * by identity (D-22), name allocation is collision-free (`allocateTopLevelNames`),
 * statics come from constructor-typed variables only, and `@anonymous` follows
 * whether a JavaScript value exists (`emitInterface`).
 */
export const UNSUPPORTED_FLAGS = {
  generateHtml: {
    flag: "--generate-html",
    message:
      "dartify never generates dart:html itself; browser types in your declarations map to dart:html types by identity, so remove the flag.",
  },
  renameConflictingTypes: {
    flag: "--rename-conflicting-types",
    message:
      "dartify always gives colliding names distinct Dart names (a value that shares its name with a type is bound as JS$Name), so remove the flag.",
  },
  explicitStatic: {
    flag: "--explicit-static",
    message:
      "dartify never assumes the members of a variable's anonymous type are static: the variable becomes a getter of an anonymous class, and only a constructor-typed variable ({ new (): T; ... }) contributes static members, so remove the flag.",
  },
  trustJsTypes: {
    flag: "--trust-js-types",
    message:
      "dartify marks a declaration @anonymous exactly when no JavaScript value of that name exists (a type-only interface), so the flag has no equivalent; remove it.",
  },
} as const;

export function resolveCliOptions(args: ParsedArgs): CliOptions {
  const messages: string[] = [];
  for (const [key, { flag, message }] of Object.entries(UNSUPPORTED_FLAGS)) {
    if (args[key as keyof typeof UNSUPPORTED_FLAGS]) messages.push(`${flag} is not supported: ${message}`);
  }
  if (messages.length > 0) throw new CliUsageError(messages);

  const flagged = (args.defFiles ?? []).map(String);
  const positional = (args.inputs ?? []).map(String);
  const inputs = [...flagged, ...positional];
  if (inputs.length === 0) {
    throw new CliUsageError([
      "No input given: pass declaration files or glob patterns, positionally or with -d (see --help).",
    ]);
  }

  // `-o` and `--destination` are one option, so giving both (or one twice)
  // would silently pick one; ask which was meant.
  if (Array.isArray(args.output)) {
    throw new CliUsageError(["The output directory was given more than once (-o, --output, --destination)."]);
  }
  if (Array.isArray(args.basePath)) {
    throw new CliUsageError(["--base-path was given more than once."]);
  }
  const output = args.output as string | undefined;
  const basePath = args.basePath as string | undefined;

  const toStdout = positional.length > 0 && output === undefined;
  if (toStdout && args.watch) {
    throw new CliUsageError([
      "--watch writes files, but printing to stdout was selected (positional inputs without -o/--destination): pass -o or --destination.",
    ]);
  }

  return {
    inputs,
    ...(output !== undefined ? { output } : {}),
    ...(basePath !== undefined ? { basePath } : {}),
    ...(args.tsconfig !== undefined ? { tsconfig: args.tsconfig } : {}),
    enableLogs: args.enableLogs ?? false,
    verbose: args.verbose ?? false,
    dryRun: args.dryRun ?? false,
    watch: args.watch ?? false,
    ...(args.jsRoot !== undefined ? { jsRoot: args.jsRoot } : {}),
    toStdout,
  };
}
