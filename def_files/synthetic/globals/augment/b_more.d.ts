// A module augmenting the same global through `declare global`: one extension,
// owned by the first declaring file (a_window.d.ts).
export {};
declare global {
  interface Window {
    other: boolean;
  }
}
