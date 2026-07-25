import { transpilerContext } from "./context";
import { TypeParser } from "./engine/parser/type/type";

/**
 * Returns every piece of mutable global state to its initial condition.
 *
 * Both the transpiler context and the type parser are singletons, so without
 * this each run inherits the previous one's state: symbols from an earlier
 * `Transpiler` stay in the table (`R-11`), and cached `IRType`s keyed only on
 * source text stay visible across files and runs (`T-04`). Two tests in one
 * process would contaminate each other.
 *
 * This module exists separately from `context.ts` on purpose: `context` must
 * not import the type parser, because the parser's handlers import `context`
 * and the cycle would put `TypeParser` in the temporal dead zone during module
 * initialisation.
 */
export function resetTranspilerState(): void {
  transpilerContext.reset();
  TypeParser.getInstance().clearCache();
}
