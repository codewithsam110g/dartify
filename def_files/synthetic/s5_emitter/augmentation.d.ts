import { WidgetType } from "./foundation";

export {};

/** Global declarations are hoisted and emitted without a `global` JS prefix. */
declare global {
  interface GlobalWidgetRegistry {
    active: WidgetType | null;
  }

  var globalWidgetRegistry: GlobalWidgetRegistry;
}

/**
 * External-module augmentation is deliberately suppressed in Stage 4 and must
 * remain visible in CLI diagnostics until a complete merge policy is shipped.
 */
declare module "./foundation" {
  interface WidgetOptions {
    augmented?: boolean;
  }

  interface WidgetType {
    fromAugmentation(): void;
  }
}
