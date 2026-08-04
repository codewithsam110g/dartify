import { dirname, resolve } from "path";
import { ResolutionHostFactory, ts } from "ts-morph";
import { ModuleFallbackResolution } from "./types";

export interface ModuleFallbackAmbiguity {
  file: string;
  specifier: string;
  candidates: string[];
}

interface FallbackCallbacks {
  resolved(value: ModuleFallbackResolution): void;
  ambiguous(value: ModuleFallbackAmbiguity): void;
}

function normalize(filePath: string): string {
  return filePath.split("\\").join("/");
}

function uniqueExisting(
  candidates: string[],
  host: ts.ModuleResolutionHost,
): string[] {
  return [...new Set(candidates.map((candidate) => normalize(candidate)))]
    .filter((candidate) => host.fileExists(candidate))
    .sort();
}

function relativeCandidates(
  specifier: string,
  containingFile: string,
  host: ts.ModuleResolutionHost,
): string[] {
  const base = resolve(dirname(containingFile), specifier);
  return uniqueExisting([`${base}.d.ts`, resolve(base, "index.d.ts")], host);
}

function explicitInputCandidates(
  specifier: string,
  explicitInputs: readonly string[],
): string[] {
  const suffixes = [
    `/${specifier}.d.ts`,
    `/${specifier}/index.d.ts`,
  ];
  if (!specifier.includes("/")) {
    suffixes.push(`/@types/${specifier}/index.d.ts`);
  }

  return explicitInputs
    .filter((file) => suffixes.some((suffix) => file.endsWith(suffix)))
    .sort();
}

/** Bundler resolution with a conservative declaration-file fallback. */
export function createDeclarationResolutionHost(
  explicitFiles: readonly string[],
  callbacks: FallbackCallbacks,
): ResolutionHostFactory {
  const explicitInputs = [...new Set(explicitFiles.map(normalize))].sort();

  return (moduleResolutionHost, getCompilerOptions) => {
    const cache = ts.createModuleResolutionCache(
      moduleResolutionHost.getCurrentDirectory?.() ?? process.cwd(),
      (fileName) => fileName,
      getCompilerOptions(),
    );

    return {
      resolveModuleNames(moduleNames, containingFile) {
        return moduleNames.map((specifier) => {
          const standard = ts.resolveModuleName(
            specifier,
            containingFile,
            getCompilerOptions(),
            moduleResolutionHost,
            cache,
          ).resolvedModule;
          if (standard) return standard;

          const relative = ts.isExternalModuleNameRelative(specifier);
          const candidates = relative
            ? relativeCandidates(specifier, containingFile, moduleResolutionHost)
            : explicitInputCandidates(specifier, explicitInputs);

          if (candidates.length > 1) {
            callbacks.ambiguous({
              file: normalize(containingFile),
              specifier,
              candidates,
            });
            return undefined;
          }
          if (candidates.length === 0) return undefined;

          const resolvedFile = candidates[0];
          callbacks.resolved({
            file: normalize(containingFile),
            specifier,
            resolvedFile,
            strategy: relative ? "relativeDeclaration" : "explicitInput",
          });
          return {
            resolvedFileName: resolvedFile,
            extension: ts.Extension.Dts,
            isExternalLibraryImport: !relative,
          };
        });
      },
    };
  };
}
