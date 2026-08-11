/** Primary ambient external module, distinct from module augmentation. */
declare module "virtual-sdk" {
  export interface Remote {
    readonly connected: boolean;
  }

  export function connect(url: string): Promise<Remote>;
}
