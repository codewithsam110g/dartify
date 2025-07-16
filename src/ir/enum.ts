export interface IREnum {
  name: string;
  members: {
    name: string;
    value?: string | number;
  }[];
}
