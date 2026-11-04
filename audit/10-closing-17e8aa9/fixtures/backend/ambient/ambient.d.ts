// Script file declaring an ambient external module (common in @types).
declare module "@scope/pkg" {
  export class Widget {
    constructor(name: string);
  }
  export function make(): Widget;
}
