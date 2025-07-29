// in a new file, e.g., `tests/test-utils.ts`

import * as ts from "ts-morph";

const project = new ts.Project({
  compilerOptions: {
    // Basic options to ensure parsing works
    target: ts.ScriptTarget.ESNext,
  },
});

/**
 * Creates a ts.Node for a given TypeScript statement.
 * @param statement - The TypeScript code snippet (e.g., "interface Foo { bar: string; }")
 * @returns The first statement node from the parsed source file.
 */
export function createStatementNode(statement: string): ts.Statement {
  const sourceFile = project.createSourceFile(
    "__virtual_statement.ts",
    statement,
    { overwrite: true },
  );
  return sourceFile.getStatements()[0];
}

/**
 * Creates a ts.TypeNode for a given TypeScript type snippet.
 * This is trickier because a type isn't a statement. We wrap it in a
 * type alias to make it a valid statement that we can parse.
 * @param typeSnippet - The TypeScript type (e.g., "string | number | null")
 * @returns The ts.TypeNode for that snippet.
 */
export function createTypeNode(typeSnippet: string): ts.TypeNode {
  const sourceFile = project.createSourceFile(
    "__virtual_type.ts",
    `type __DUMMY = ${typeSnippet};`, // The wrapper
    { overwrite: true },
  );

  const typeAlias = sourceFile.getTypeAlias("__DUMMY")!;
  return typeAlias.getTypeNode()!;
}
