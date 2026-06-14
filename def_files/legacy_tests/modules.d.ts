// Legacy Test Cases: Modules / Namespaces
// Extracted from js_facade_gen/test/module_test.ts & js_interop_test.ts

// 8.1 Namespace with interface
declare namespace m1 {
  interface A {
    x(): void;
  }
}

// 8.2 Duplicate name in different namespace (rename collision)
declare namespace m2 {
  interface A {
    y(): void;
  }
}

// 8.3 Nested namespaces
declare namespace foo.m1 {
  function x(): number;
}
declare namespace foo.m2 {
  function x(): string;
}

// 8.4 Namespace with class
declare namespace ns1 {
  class A {
    constructor(x: any);
  }
}
declare namespace ns2 {
  class A {
    constructor(y: any);
  }
}

// 8.5 Cross-namespace type references
declare namespace cross1 {
  class A {
    constructor(x: cross2.A);
  }
}
declare namespace cross2 {
  class A {
    constructor(y: cross1.A);
  }
}

// 8.6 Deeply nested namespaces with collision
declare namespace deep1 {
  namespace foo {
    interface A {
      x(): void;
    }
  }
}
declare namespace deep2 {
  namespace foo {
    interface A {
      y(): void;
    }
  }
}
declare namespace deep3 {
  namespace foo {
    interface A {
      z(): void;
    }
  }
}

declare function registerDeep(y: deep2.foo.A, z: deep3.foo.A): void;

// 8.7 Library augmentation (should be ignored)
// declare module '../some_other_module' {
//   interface Foo { }
// }

// 8.8 Namespace with variable declaration
declare namespace moduleWithVar {
  interface XType {
    a: string;
    b: number;
    c(): boolean;
  }

  var X: {
    prototype: XType;
    new (a: string, b: number): XType;
  };
}
