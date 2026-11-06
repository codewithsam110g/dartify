/**
 * What the CLI prints about a finished build. One-shot runs and every watch
 * rebuild go through `reportRun`, so a diagnostic cannot be visible in one
 * mode and silent in the other.
 */
import type { GenerationDiagnostic } from "../engine/phase/symbolGeneration";
import type { AnalysisReport } from "../transpiler";
import {
  formatLinkWarning,
  formatSemanticWarning,
  formatVerboseLinkReport,
} from "./linker";
import { displayPath } from "./path";

/** The parts of a render or watch result that are reported. */
export interface RunReport {
  analysis: Pick<AnalysisReport, "generation" | "link" | "resolution">;
  files: ReadonlyMap<string, { diagnostics: readonly { code: string; message: string }[] }>;
}

export interface ReportOptions {
  /** `-v`: itemize the linker, semantic and emission records. */
  verbose: boolean;
  /** Working directory paths are shown relative to. */
  cwd?: string;
}

/** `path:line:column TSnnnn message`, one line per failure (HD-13). */
export function formatGenerationFailure(
  failure: GenerationDiagnostic,
  cwd: string = process.cwd(),
): string {
  const where =
    failure.line === undefined
      ? displayPath(failure.file, cwd)
      : `${displayPath(failure.file, cwd)}:${failure.line}${failure.column === undefined ? "" : `:${failure.column}`}`;
  return `${where} ${failure.code} ${failure.message}`;
}

export function reportGenerationFailures(
  failures: readonly GenerationDiagnostic[],
  cwd: string = process.cwd(),
): void {
  for (const failure of failures) console.error(formatGenerationFailure(failure, cwd));
}

export function reportRun({ analysis, files }: RunReport, options: ReportOptions): void {
  // A build with failures writes nothing and its analysis describes a
  // recovered, partial program, so its link and emission counts would mislead.
  if (analysis.generation.length > 0) {
    reportGenerationFailures(analysis.generation, options.cwd);
    return;
  }

  const link = analysis.link;
  const semanticWarning = formatSemanticWarning(link);
  if (semanticWarning) console.warn(semanticWarning);
  const linkWarning = formatLinkWarning(link, options.verbose);
  if (linkWarning) console.warn(linkWarning);
  if (options.verbose) console.log(formatVerboseLinkReport(link));

  // Backend facts (anonymous defaults not bound, dropped heritage, const-enum
  // members without values) and unresolved re-export targets: counted
  // always, itemized with -lv (S6.4).
  const backendDiagnostics = [...files.values()].flatMap((file) => file.diagnostics);
  const exportDiagnostics = link.moduleExportDiagnostics;
  const emitted = backendDiagnostics.length + exportDiagnostics.length;
  if (emitted > 0) {
    console.warn(
      `⚠️  Emission: ${emitted} diagnostic(s)${options.verbose ? "" : "; rerun with -lv for complete records"}`,
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

  const unresolved = analysis.resolution.unresolved.length;
  if (unresolved === 0) {
    console.log("Module resolution: 0 unresolved references");
  } else {
    console.warn(
      `⚠️  Module resolution: ${unresolved} unresolved reference(s); rerun with -l for resolution details or -lv for the full linker report`,
    );
  }
}
