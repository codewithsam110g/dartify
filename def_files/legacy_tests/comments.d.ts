// Legacy Test Cases: Comments / JSDoc
// Extracted from js_facade_gen/test/main_test.ts

/**
 * A class with JSDoc.
 */
declare class DocumentedClass {
  /**
   * Method to do blah.
   * Bla bla bla.
   * Foo bar.
   */
  bar(): void;
}

/**
 * Function with link.
 * {@link this/place}
 */
declare function linkedFunc(): void;

/**
 * Function with params doc.
 * @param doc Document.
 * @return {String}
 */
declare function paramDocFunc(doc: string): string;

/**
 * Deprecated function.
 * Use SomethingElse instead.
 * @deprecated
 */
declare function deprecatedFunc(): void;

/**
 * Function with throws.
 * @throws ArgumentException If arguments are wrong
 */
declare function throwsFunc(): void;

/**
 * @module
 * This is a module for doing X.
 */

/** A documented var */
declare var documentedVar: number;

// Single line comment
declare var singleLineCommented: string;

/// Triple slash comment
declare var tripleSlashCommented: boolean;
