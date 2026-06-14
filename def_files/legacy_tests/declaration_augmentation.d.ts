// Legacy Test Cases: Declaration Augmentation (Interface + Variable Merging)
// Extracted from js_facade_gen/test/declaration_test.ts

// 13.1 Simple interface + variable merge
declare interface SimpleType {
  a: string;
  b: number;
  c(): boolean;
}
declare var SimpleX: {
  prototype: SimpleType;
  new (a: string, b: number): SimpleType;
};

// 13.2 Merge with static members
declare interface StaticMergeType {
  a: string;
  b: number;
  c(): boolean;
}
declare var StaticMergeX: {
  b: number;
  prototype: StaticMergeType;
  new (a: string, b: number): StaticMergeType;
};

// 13.3 Interface + variable default merge
interface MergeDefaultX {
  a: string;
  b: number;
  c(): boolean;
}
declare var MergeDefaultX: { d: number[] };
declare var mergeDefaultInstance: MergeDefaultX;

// 13.4 Cache-like pattern with inheritance
declare interface CacheBase {
  readonly CHECKING: number;
  readonly DOWNLOADING: number;
  readonly IDLE: number;
}
declare interface MyCache extends CacheBase {}
declare var MyCache: {
  prototype: MyCache;
  new (): MyCache;
  readonly CHECKING: number;
  readonly DOWNLOADING: number;
  readonly IDLE: number;
};

// 13.5 Event-like pattern
interface EventCache {
  oncached: (ev: Event) => any;
}
declare var EventCache: { new (): EventCache; CHECKING: number };
