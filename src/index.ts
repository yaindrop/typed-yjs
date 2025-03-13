/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs'

import { ExtendsKeyof, OptionalKeyof, Overwrite } from './utils'

export type YType = YText | YArray<any> | YMap<any>

type YTypeRecord = Record<string, YType>

// YArray / YMap values can be either YType or Json
type Value = YType | Json

namespace Value {
  export function fromSeed<S extends ValueSeed>(seed: S): ValueOf<S> {
    if (typeof seed === 'object' && seed !== null) {
      if (YTextSeedSymbol in seed) {
        return YText.fromSeed(seed) as ValueOf<S>
      } else if (YArraySeedSymbol in seed) {
        return YArray.fromSeed(seed) as ValueOf<S>
      } else if (YMapSeedSymbol in seed) {
        return YMap.fromSeed(seed) as ValueOf<S>
      }
    }
    return seed as ValueOf<S>
  }
}

type ValueRecord = Record<string, Value>

// MARK: seed
type YTypeSeed = YTextSeed | YArraySeed<any> | YMapSeed<any>

type ValueSeed = YTypeSeed | Json

type ValueRecordSeed = Record<string, ValueSeed>

// value to seed
type SeedOf<V extends ValueRecord | Value> = V extends YText
  ? YTextSeed
  : V extends YArray<infer TValue>
    ? YArraySeed<TValue>
    : V extends YMap<infer R>
      ? YMapSeed<R>
      : V extends Json
        ? V
        : never

type RecordSeedOf<V extends ValueRecord> = { [K in keyof V]: SeedOf<V[K]> }

// seed to value
type ValueOf<S extends ValueRecordSeed | ValueSeed> = S extends YTextSeed
  ? YText
  : S extends YArraySeed<infer TValue>
    ? YArray<TValue>
    : S extends YMapSeed<infer R>
      ? YMap<R>
      : S extends Json
        ? S
        : never

type ValueRecordOf<S extends ValueRecordSeed> = {
  [K in keyof S]: ValueOf<S[K]>
}

// MARK: json
type Json = JsonPrimitive | JsonArray | JsonObject
type JsonPrimitive = string | number | boolean | null
type JsonArray = Json[]
type JsonObject = Partial<{ [key: string]: Json }>

type ToJson<V extends Value> = V extends Json
  ? V
  : V extends YText
    ? string
    : V extends YArray<infer TValue>
      ? ToJson<TValue>[]
      : V extends YMap<infer R>
        ? {
            [K in keyof R]: ToJson<R[K]>
          }
        : never

// MARK: YDoc
type YTypeConstructor<T extends YType> = new () => T extends YMap<any>
  ? YMap<any>
  : T extends YArray<any>
    ? YArray<any>
    : YText

type YDocType<R extends YTypeRecord> = {
  get<K extends keyof R, TValue extends R[K]>(name: K, TypeConstructor: YTypeConstructor<TValue>): R[K]
  get<K extends keyof R>(name: K): R[K] | undefined

  getText<K extends ExtendsKeyof<R, YText>>(name: K): R[K]
  getArray<K extends ExtendsKeyof<R, YArray<any>>>(name: K): R[K]
  getMap<K extends ExtendsKeyof<R, YMap<any>>>(name: K): R[K]
}

export type YDoc<R extends YTypeRecord> = Overwrite<Y.Doc, YDocType<R>>

export namespace YDoc {
  export function from<R extends YTypeRecord>(obj: {
    [K in keyof R]: SeedOf<R[K]>
  }): YDoc<R> {
    const yDoc = new Y.Doc()
    yDoc.transact(() => {
      for (const [key, value] of Object.entries(obj)) {
        if (YTextSeedSymbol in value) {
          const yText = yDoc.getText(key)
          YText.applySeed(yText, value as YTextSeed)
        } else if (YArraySeedSymbol in value) {
          const yArray = yDoc.getArray(key)
          YArray.applySeed(yArray, value as YArraySeed<any>)
        } else if (YMapSeedSymbol in value) {
          const yMap = yDoc.getMap(key)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          YMap.applySeed(yMap as any, value as YMapSeed<any>)
        }
      }
    })
    return yDoc as unknown as YDoc<R>
  }
}

// MARK: YText
const YTextSeedSymbol = Symbol('YTextSeed')
type YTextSeed = {
  [YTextSeedSymbol]: unknown
  value: string
}

export type YText = Y.Text

export namespace YText {
  export function seed(str: string): YTextSeed {
    return Object.defineProperty({ value: str }, YTextSeedSymbol, {
      value: YTextSeedSymbol,
      writable: false,
      enumerable: false,
    }) as YTextSeed
  }

  export function fromSeed(seed: YTextSeed): YText {
    return new Y.Text(seed.value)
  }

  export function applySeed(yText: YText, seed: YTextSeed): void {
    yText.insert(0, seed.value)
  }
}

// MARK: YArray
const YArraySeedSymbol = Symbol('YArraySeed')
type YArraySeed<V extends Value> = {
  [YArraySeedSymbol]: unknown
  value: SeedOf<V>[]
}

type YArrayType<V extends Value> = {
  get(index: number): V | undefined
  toJSON(): ToJson<V>[]
}

export type YArray<V extends Value> = Overwrite<Y.Array<V>, YArrayType<V>>

export namespace YArray {
  export function seed<S extends ValueSeed>(arr: S[]): YArraySeed<ValueOf<S>> {
    return Object.defineProperty({ value: arr }, YArraySeedSymbol, {
      value: YArraySeedSymbol,
      writable: false,
      enumerable: false,
    }) as YArraySeed<ValueOf<S>>
  }

  export function fromSeed<S extends ValueSeed>(seed: YArraySeed<ValueOf<S>>): YArray<ValueOf<S>> {
    const yArray = new Y.Array() as unknown as YArray<ValueOf<S>>
    applySeed(yArray, seed)
    return yArray
  }

  export function applySeed<S extends ValueSeed>(yArray: YArray<ValueOf<S>>, seed: YArraySeed<ValueOf<S>>): void {
    yArray.insert(0, seed.value.map(Value.fromSeed) as ValueOf<S>[])
  }
}

// MARK: YMap
const YMapSeedSymbol = Symbol('YMapSeed')
type YMapSeed<R extends ValueRecord> = {
  [YMapSeedSymbol]: typeof YMapSeedSymbol
  value: RecordSeedOf<R>
}

type EntryType<R extends ValueRecord> = {
  [key in keyof R]-?: [key, Required<R>[key]]
}[keyof R]

type YMapType<R extends ValueRecord> = {
  clone(): YMap<R>
  keys(): IterableIterator<keyof R>
  values(): IterableIterator<R[keyof R]>
  entries(): IterableIterator<EntryType<R>>
  forEach(fn: (key: keyof R, value: R[keyof R], self: YMap<R>) => void): void
  delete(key: OptionalKeyof<R>): void
  set<K extends keyof R, V extends R[K]>(key: K, value: V): V
  get<K extends keyof R>(key: K): R[K]
  has(key: keyof R): boolean
  toJSON(): {
    [K in keyof R]: ToJson<R[K]>
  }
  [Symbol.iterator](): IterableIterator<EntryType<R>>
}

export type YMap<R extends ValueRecord> = Overwrite<Y.Map<R>, YMapType<R>>

export namespace YMap {
  export function seed<S extends ValueRecordSeed>(obj: S): YMapSeed<ValueRecordOf<S>> {
    return Object.defineProperty({ value: obj }, YMapSeedSymbol, {
      value: YMapSeedSymbol,
      writable: false,
      enumerable: false,
    }) as YMapSeed<ValueRecordOf<S>>
  }

  export function fromSeed<S extends ValueRecordSeed>(seed: YMapSeed<ValueRecordOf<S>>): YMap<ValueRecordOf<S>> {
    const yMap = new Y.Map() as unknown as YMap<ValueRecordOf<S>>
    applySeed(yMap, seed)
    return yMap
  }

  export function applySeed<S extends ValueRecordSeed>(
    yMap: YMap<ValueRecordOf<S>>,
    seed: YMapSeed<ValueRecordOf<S>>,
  ): void {
    for (const [k, v] of Object.entries(seed.value)) {
      yMap.set(k, Value.fromSeed(v) as ValueRecordOf<S>[string])
    }
  }
}
