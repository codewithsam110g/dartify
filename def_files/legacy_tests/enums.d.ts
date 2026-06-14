// Legacy Test Cases: Enums
// Extracted from js_facade_gen/test/declaration_test.ts

// 7.1 Basic enum
declare enum Color {
  Red,
  Green,
  Blue,
}

// 7.2 Empty enum
declare enum EmptyEnum {}

// 7.3 Enum with initializers
declare enum InitEnum {
  Red = 1,
  Green = 2,
  Blue = 4,
}

// 7.4 String enum
declare enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}
