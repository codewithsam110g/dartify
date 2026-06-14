// Legacy Test Cases: Classes
// Extracted from js_facade_gen/test/declaration_test.ts & js_interop_test.ts

// 2.1 Empty class
declare class EmptyClass {}

// 2.2 Class extends
declare class ChildClass extends ParentClass {}
declare class ParentClass {}

// 2.3 Class implements
declare class ImplClass implements InterfaceY, InterfaceZ {}
interface InterfaceY {}
interface InterfaceZ {}

// 2.4 Class extends + implements
declare class ExtendsImplClass extends ParentClass implements InterfaceZ {}

// 2.5 Abstract class
declare abstract class AbstractClass {}

// 2.6 Class fields
declare class FieldsClass {
  x: number;
  y: string;
}

// 2.7 Class with constructor
declare class ConstructorClass {
  constructor();
}

// 2.8 Static fields
declare class StaticFieldClass {
  static x: number;
}

// 2.9 Methods
declare class MethodClass {
  doSomething(): void;
}

// 2.10 Method with return type and params
declare class MethodParamsClass {
  compute(a: number, b: string): number;
}

// 2.11 Getter
declare class GetterClass {
  readonly y: number;
}

// 2.12 Setter
declare class SetterClass {
  y: number;
}

// 2.13 Readonly fields
declare class ReadonlyClass {
  readonly x: number;
  readonly y: string;
  readonly z: boolean;
}

// 2.14 Generic class
declare class GenericClass<A, B> {
  a: A;
}

// 2.15 Nested generic extends
declare class NestedGenericClass<A extends BaseGeneric<C>> {}
declare class BaseGeneric<T> {}
declare class C {}

// 2.16 Multiple generic extends
declare class MultiGenericClass<A extends A1, B extends B1> {}
declare class A1 {}
declare class B1 {}

// 2.17 Generic class usage
declare class GenericUsageClass extends BaseGeneric<A1> {}
