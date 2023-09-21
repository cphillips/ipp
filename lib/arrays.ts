//cphillips
export interface ArrayWithLookup<T> extends Array<T> {
  lookup: { [key: string]: T };
  alts: string
  members:any
}

export interface ArrayWithType<T> extends Array<T> {
  type?: string;
}