export type ExtendsOf<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

export type ExtendsKeyof<T, V> = keyof ExtendsOf<T, V>;

export type OptionalOf<T extends object> = {
  [K in keyof T as object extends Pick<T, K> ? K : never]: Required<T>[K];
};

export type OptionalKeyof<T extends object> = keyof OptionalOf<T>;

export type Overwrite<T, U> = Omit<T, keyof U> & U;
