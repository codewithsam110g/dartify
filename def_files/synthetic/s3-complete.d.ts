/** Constraint used throughout the Stage 3 IR acceptance fixture. */
export interface Base {
  base: string;
}

/** Default generic argument used throughout the fixture. */
export interface Default extends Base {
  defaulted: true;
}

/** A generic class with every declaration-level fact Stage 3 must retain. */
export default abstract class Box<T extends Base = Default>
  implements Base
{
  /** A visible instance property. */
  public base: string;

  /** A protected static property. */
  protected static readonly current?: T;

  /** A private instance property. */
  private secret: string;

  /** Construct a box. */
  protected constructor(value: T);

  /** Map the current value. */
  public abstract map<U extends Base = Default>(value: U): Box<U>;

  /** Read arbitrary additional values. */
  readonly [key: string]: unknown;
}

/** An interface that is both callable and constructable, with overloads. */
export interface Callable<T extends Base = Default> {
  /** Generic call overload. */
  <U extends T = T>(...values: U[]): T;

  /** Plain call overload. */
  (value: T): T;

  /** Generic construct overload. */
  new <U extends T = T>(value: U): Box<U>;

  /** Plain construct overload. */
  new (value: T): Box<T>;
}

/** A generic alias containing independently scoped inline types. */
export type Container<T extends Base = Default> = {
  value: T;
  nested: { item: T };
};

/** A generic function type. */
export type Mapper = <T extends Base = Default>(value: T) => T;

/** A bigint literal used to prove cloning does not pass through JSON. */
export type Huge = 9007199254740993n;

/** Create a box.
 * @param value value to wrap
 * @param fallback optional fallback value
 */
export declare function create<T extends Base = Default>(
  value: T,
  fallback?: T,
): Box<T>;

/** First overload with inline parameter and return types. */
export declare function convert(value: { text: string }): { ok: true };

/** Second overload with different inline parameter and return types. */
export declare function convert(value: { count: number }): { ok: false };

/** Every enum initializer category retained by Stage 3. */
export enum Mixed {
  Implicit,
  Numeric = 2,
  Text = "text",
  Computed = Numeric << 1,
}

/** Mutable var declaration. */
export declare var mutableValue: Base;

/** Mutable let declaration. */
export declare let replaceableValue: Base;

/** Constant declaration. */
export declare const fixedValue: Default;
