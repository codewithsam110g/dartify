import { Symbol } from "@/symbol";
import { ResolvedModuleExport } from "@/symbol/exports";
import { LinkedProgram } from "@engine/phase/linkerPhase";

/**
 * The output-language seam (`E-11b`, S5.1).
 *
 * The IR is target-agnostic; a backend turns one source file's linked symbols
 * into one target library. v1 ships the `package:js` backend
 * (`packagejs/`). The v2 `dart:js_interop` backend implements this same
 * interface over the same `LinkedProgram`; nothing upstream changes.
 */
export interface Backend {
  /** Stable identifier, e.g. `package:js`. */
  readonly id: string;
  /**
   * Renders every library of one program, keyed by source file. Pure: no
   * filesystem, no state outlives the call. Whole-program rather than
   * per-file because some target rules (Dart's ambiguous-export check) span
   * libraries.
   */
  renderLibraries(inputs: readonly LibraryInput[]): Map<string, RenderedLibrary>;
}

export interface LibraryInput {
  program: LinkedProgram;
  /** Absolute path of the originating `.d.ts`. */
  sourceFile: string;
  /** Path this library will be written to. */
  outputPath: string;
  /** Output path of every library rendered in this run, by source file. */
  outputPathOfFile: ReadonlyMap<string, string>;
  /** This file's symbols, in table order. */
  symbols: readonly Symbol[];
  /** This file's resolved module export records (`P-17`). */
  moduleExports: readonly ResolvedModuleExport[];
  /**
   * Where a shared runtime-support library goes, when the run renders more
   * than one library (`E-40`). Interop helpers such as `Promise<T>` are then
   * declared once there, so values flow between generated libraries. Absent
   * for single-library runs, which stay self-contained.
   */
  supportPath?: string;
}

/**
 * Key under which `renderLibraries` returns the shared support library, when
 * one was needed. It has no TypeScript source file.
 */
export const SUPPORT_LIBRARY = "\u0000dartify-support";

export interface BackendDiagnostic {
  code: string;
  file: string;
  name: string;
  message: string;
}

export interface RenderedLibrary {
  content: string;
  diagnostics: BackendDiagnostic[];
}
