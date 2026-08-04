/**
 * True when a declaration file belongs to runtime/compiler support that
 * dartify deliberately does not parse or emit.
 *
 * This predicate is shared by project categorisation and reference extraction;
 * those two decisions must never drift or the linker gains phantom edges.
 */
export function isStdlibFile(filePath: string): boolean {
  if (filePath.includes("@types/node/")) return true;
  if (filePath.includes("undici-types/")) return true;
  return /typescript\/lib\/lib\..*\.d\.ts$/.test(filePath);
}
