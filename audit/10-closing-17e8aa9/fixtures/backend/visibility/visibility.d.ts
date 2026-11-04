export declare class Account {
  private secret;
  protected internalId: number;
  private hash(input: string): string;
  balance: number;
}
