import { transpilerContext } from "./context";

/**
 * Returns every piece of mutable global state to its initial condition.
 *
 * The transpiler context is a singleton, so without this each run inherits the
 * previous one's state — symbols from an earlier `Transpiler` stay in the table
 * (`R-11`) and two tests in one process contaminate each other.
 *
 * This is the single reset seam. It stayed a module of its own after the type
 * cache was removed (`T-13`) because everything S1 adds that holds per-run
 * state — the minted-alias registry above all — resets here too, and because
 * `context.ts` must not import from the parser: the parser's handlers import
 * `context`, and the cycle would put those bindings in the temporal dead zone
 * during module initialisation.
 */
export function resetTranspilerState(): void {
  transpilerContext.reset();
}
