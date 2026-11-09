// The package entry. Every public name is spelled the way TypeScript users import it.
export * from "./barrel";
export * from "./core";
export { Widget as Gadget, helper as util } from "./widgets";
export * as geometry from "./geometry";

declare function hidden(x: number): number;
/** Exported only under an alias: its Dart name is `publicName`. */
export { hidden as publicName };

/** The entry's own default export is `Root.default`. */
export default function run(x: number): number;
