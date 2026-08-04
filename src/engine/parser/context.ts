import * as ts from "ts-morph";
import { IRDeclaration } from "@ir/declaration";

export type RegisterHoistedDeclaration = (
  fqn: string,
  declaration: IRDeclaration,
) => void;

/**
 * Immutable scope passed through declaration and type parsing.
 *
 * A child context cannot mutate its parent, so a thrown parser cannot poison
 * the FQN used by the next declaration (`R-09`). Hoisted anonymous
 * declarations are returned through a callback rather than reaching into the
 * process-wide transpiler context from the type parser.
 */
export class ParseContext {
  public constructor(
    public readonly scopeFQN: string,
    private readonly registerHoistedDeclaration?: RegisterHoistedDeclaration,
  ) {}

  public child(segment: string): ParseContext {
    return new ParseContext(
      `${this.scopeFQN}|${segment}`,
      this.registerHoistedDeclaration,
    );
  }

  public atFQN(fqn: string): ParseContext {
    return new ParseContext(fqn, this.registerHoistedDeclaration);
  }

  public registerHoisted(fqn: string, declaration: IRDeclaration): void {
    this.registerHoistedDeclaration?.(fqn, declaration);
  }
}

export function declarationParseContext(
  node: ts.Node,
  name: string,
  registerHoistedDeclaration?: RegisterHoistedDeclaration,
): ParseContext {
  return new ParseContext(
    `${node.getSourceFile().getFilePath()}::${name}`,
    registerHoistedDeclaration,
  );
}

export function typeParseContext(node?: ts.Node): ParseContext {
  const filePath = node?.getSourceFile().getFilePath() ?? "/virtual.d.ts";
  return new ParseContext(`${filePath}::Global`);
}
