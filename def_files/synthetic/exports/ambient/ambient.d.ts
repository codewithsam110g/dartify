// Script file declaring an ambient external module (common in @types).
declare module "@scope/pkg" {
  export class Widget {
    constructor(name: string);
    label(): string;
  }
  export function make(): Widget;
  // Exported only under another name: Dart gets `shown` (HD-18).
  function hidden(): string;
  export { hidden as shown };
}
