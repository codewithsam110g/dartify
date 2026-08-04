import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";
import { ParseContext } from "@parser/context";
import { isNullOrUndefined } from "./keywords";

export function handleUnionType(
  node: ts.UnionTypeNode,
  depth: number,
  context: ParseContext,
): IRType {
  const unionNodes = node.getTypeNodes();

  const isNullable = unionNodes.some(isNullOrUndefined);
  const nonNullUnionNodes = unionNodes.filter(
    (node) => !isNullOrUndefined(node),
  );

  const unionIRs = nonNullUnionNodes.map((uNode) =>
    parseType(uNode, depth + 1, context),
  );

  // `null | undefined` filters down to nothing. The old shape returned a Union
  // with an empty `unionTypes`, and `emitType` reached straight for `[0]` — so
  // this threw, and the emitter phase's try/catch turned a whole declaration
  // into `// ERROR emitting ...` (`T-15`).
  if (unionIRs.length === 0) {
    return { kind: TypeKind.Any, name: TypeKind.Any, isNullable: true };
  }

  // A union of one member *is* that member. Keeping the wrapper meant the IR
  // carried a node that means nothing, and every backend had to reimplement the
  // same unwrapping — `emitType` already did (`T-12`). Normalised here so the
  // IR states the truth and the emitter stops compensating.
  if (unionIRs.length === 1) {
    return {
      ...unionIRs[0],
      isNullable: unionIRs[0].isNullable || isNullable,
    };
  }

  return {
    kind: TypeKind.Union,
    name: TypeKind.Union,
    isNullable,
    unionTypes: unionIRs,
  };
}
