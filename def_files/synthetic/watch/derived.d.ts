import { Animal, Config, Level, LIMIT, Shape, WidgetType } from "./base";

export interface Bone extends Shape {
  size: number;
}

export declare class Dog extends Animal<Bone> {
  feed(food: Bone): void;
  bark(times?: number): string;
}

export interface Box<T extends Shape = Shape> {
  value: T;
}

export declare function unbox<T extends Shape>(box: Box<T>): T;

export declare function limit(): typeof LIMIT;

export declare function level(): typeof Level.High;

export declare function configure(config: Config): WidgetType;

/** Bound by name to the global script declaration. */
export declare function global(thing: GlobalThing): void;
