export declare class Widget {
  constructor(name: string);
  readonly name: string;
  label(): string;
  static make(name: string): Widget;
}

export declare function helper(text: string): string;
