/**
 * The file extensions dartify treats as declaration inputs (HD-04): `.d.ts`
 * and the ES-module / CommonJS flavours TypeScript uses for dual-package
 * typings. One list, so the CLI's input rules, output-path derivation and
 * library naming cannot disagree about what a declaration file is.
 */
export const DECLARATION_SUFFIXES = [".d.ts", ".d.mts", ".d.cts"] as const;

export function isDeclarationFileName(fileName: string): boolean {
  return DECLARATION_SUFFIXES.some((suffix) => fileName.endsWith(suffix));
}

/** `a/b/foo.d.mts` -> `a/b/foo`; a name without a declaration suffix is returned unchanged. */
export function stripDeclarationSuffix(fileName: string): string {
  const suffix = DECLARATION_SUFFIXES.find((candidate) => fileName.endsWith(candidate));
  return suffix ? fileName.slice(0, -suffix.length) : fileName;
}
