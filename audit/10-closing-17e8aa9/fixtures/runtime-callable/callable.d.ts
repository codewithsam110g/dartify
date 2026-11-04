// js_facade_gen §3.8 shape: a callable interface that also has members.
export interface Counter {
  (step: number): number;
  total: number;
}
export declare function makeCounter(): Counter;
