import { Dog } from "./derived";

/** Inherits from `Animal` through `Dog` without importing `base`. */
export declare class Puppy extends Dog {
  play(): void;
}
