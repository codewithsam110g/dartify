import path from "path";

/** Whether `file` is `root` itself or lies under it (a `..x` sibling does not). */
export function isInside(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return relative.split(path.sep)[0] !== ".." && !path.isAbsolute(relative);
}

/**
 * A file path as the user should read it: relative to the working directory
 * when it lies inside it, absolute otherwise.
 */
export function displayPath(file: string, cwd: string = process.cwd()): string {
  return file !== cwd && isInside(cwd, file) ? path.relative(cwd, file) : file;
}
