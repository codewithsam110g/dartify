import { transpilerContext } from "./context";

/**
 * Returns every piece of mutable global state to its initial condition.
 *
 * The transpiler context is a singleton, so without this each run inherits the
 * previous one's state — symbols from an earlier `Transpiler` stay in the table
 * (`R-11`) and two tests in one process contaminate each other.
 *
 * This is the single reset seam. It stayed a module of its own after the type
 * cache was removed (`T-04`) so that entry points have one thing to call as
 * more global state appears.
 *
 * It does **not** reset the minted-alias registry, and an earlier version of
 * this comment claimed it did. `AliasRegistry` is constructed per file inside
 * `registerAliasSymbols` and never outlives it, so there is nothing global to
 * clear. If that ever changes, this is where it goes.
 */
export function resetTranspilerState(): void {
  transpilerContext.reset();
}
