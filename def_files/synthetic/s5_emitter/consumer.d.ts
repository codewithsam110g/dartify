import {
  Codec,
  Entity,
  Registry,
  Service,
  Toolkit,
  Widget as WidgetConstructor,
  WidgetType,
} from "./foundation";

/** Imported generic and merged declarations exercise cross-file references. */
export interface Consumer extends Entity<number> {
  service: Service;
  codec: Codec;
  registry: Registry<Entity<number>>;
  widget: WidgetType;
  create: typeof WidgetConstructor;
  options: Toolkit.Options;
}

/** Same leaf name in two namespaces must remain unique in Dart. */
export declare namespace Alpha {
  interface Options {
    alpha: string;
  }
}
export declare namespace Beta {
  interface Options {
    beta: number;
  }
}

export declare function useOptions(value: Alpha.Options): Beta.Options;
