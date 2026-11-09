// The same global declared identically in two script files is one declaration
// (HD-06): one binding, owned by this file. `over` and `diff` differ between the
// files, so they keep the D-12 behaviour (overloads; a conflict that stays visible).
declare var shared: number;
declare function same(x: number): string;
declare function over(x: number): string;
declare var diff: number;
declare function useShared(): number;
