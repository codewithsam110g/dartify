import * as morph from "ts-morph";

export const FQN_SEPARATOR = "::";
export const SCOPE_SEPARATOR = "|";

export function createFQN(
  filePath: string,
  scopes: readonly string[],
  name: string,
): string {
  const logicalName = [...scopes, name].filter(Boolean).join(SCOPE_SEPARATOR);
  return `${filePath}${FQN_SEPARATOR}${logicalName}`;
}

export function createFQNPrefix(
  filePath: string,
  scopes: readonly string[],
): string {
  const logicalPrefix = scopes.length > 0 ? `${scopes.join(SCOPE_SEPARATOR)}|` : "";
  return `${filePath}${FQN_SEPARATOR}${logicalPrefix}`;
}

export function sourceFileOfFQN(fqn: string): string {
  const separator = fqn.indexOf(FQN_SEPARATOR);
  return separator === -1 ? fqn : fqn.substring(0, separator);
}

export function logicalNameOfFQN(fqn: string): string {
  const separator = fqn.indexOf(FQN_SEPARATOR);
  return separator === -1 ? "" : fqn.substring(separator + FQN_SEPARATOR.length);
}

export function terminalNameOfFQN(fqn: string): string {
  const logical = logicalNameOfFQN(fqn);
  const parts = logical.split(SCOPE_SEPARATOR);
  return parts[parts.length - 1] ?? "";
}

function declarationName(
  declaration: morph.Node,
  symbolName: string,
): string | undefined {
  const candidate = declaration as morph.Node & { getName?: () => string };
  const ownName = candidate.getName?.();
  if (ownName && ownName !== "default") return ownName;
  if (symbolName && symbolName !== "default") return symbolName;
  return ownName;
}

/**
 * Builds the exact FQN symbol generation assigns to a declaration.
 */
export function declarationFQN(
  declaration: morph.Node,
  symbolName: string,
): string | null {
  const name = declarationName(declaration, symbolName);
  if (!name) return null;

  const scopes: string[] = [];
  let parent = declaration.getParent();
  while (parent) {
    if (morph.Node.isModuleDeclaration(parent)) {
      scopes.unshift(parent.getName());
    }
    parent = parent.getParent();
  }

  return createFQN(declaration.getSourceFile().getFilePath(), scopes, name);
}
