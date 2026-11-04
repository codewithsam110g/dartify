/** Root of the inheritance chain. */
export declare class Animal<T = string> {
  constructor(name: string);
  name: string;
  feed(food: T): void;
  static count: number;
}

export interface Shape {
  id: string;
}

/** Reopened across statements: merged into one declaration. */
export interface Config {
  a: string;
}

export interface Config {
  b: number;
}

/** Constructor companion: merged with `Widget` into one class. */
export interface WidgetType {
  label: string;
}

export declare var Widget: {
  new (label: string): WidgetType;
  prototype: WidgetType;
  version: string;
};

export declare const LIMIT: 10;

export declare enum Level {
  Low,
  High = 4,
}

export type Pair<A, B = A> = [A, B];
