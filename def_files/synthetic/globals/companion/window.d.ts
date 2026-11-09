// An augmentation and the lib type's value companion in one file (HD-23): the
// interface becomes the extension on dart:html's Window; the companion's
// members, which would be statics on the SDK type, are reported, not bound.
interface Window {
  companionProp: string;
}
declare var Window: {
  prototype: Window;
  new (): Window;
  staticThing: number;
};
