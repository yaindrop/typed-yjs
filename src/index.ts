/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs'

import { ExtendsKeyof, OptionalKeyof, Overwrite } from './utils'

// MARK: YType
// Only support YText, YArray, YMap for now
export type YType = YText | YArray<any> | YMap<any>

// YArray / YMap values can be either YType or Json
export type YValue = YType | Json

// MARK: json
type Json = JsonPrimitive | JsonArray | JsonObject
type JsonPrimitive = string | number | boolean | null
type JsonArray = Json[]
type JsonObject = Partial<{ [key: string]: Json }>

export type JsonOf<V extends YValue> =
  V extends YMap<infer R>
    ? { [K in keyof R]: JsonOf<R[K]> }
    : V extends YArray<infer TValue>
      ? JsonOf<TValue>[]
      : V extends YText
        ? string
        : V extends Json
          ? V
          : never

export type JsonOfYDoc<R extends YDocRecord> = {
  [K in keyof R]: JsonOf<R[K]>
}

// MARK: YText
export type YText = Y.Text

export namespace YText {
  export function from(initialValue: string): YText {
    return new Y.Text(initialValue)
  }
}

// MARK: YArray
type YArrayType<V extends YValue> = {
  get(index: number): V | undefined
  toJSON(): JsonOf<V>[]
}

export type YArray<V extends YValue> = Overwrite<Y.Array<V>, YArrayType<V>>

export namespace YArray {
  export function from<V extends YValue>(initialValue: V[]): YArray<V> {
    return Y.Array.from(initialValue as any[]) as unknown as YArray<V>
  }
}

// MARK: YMap
type YMapRecord = Record<string, YValue>

type YMapEntry<R extends YMapRecord> = {
  [key in keyof R]-?: [key, Required<R>[key]]
}[keyof R]

type YMapType<R extends YMapRecord> = {
  clone(): YMap<R>
  keys(): IterableIterator<keyof R>
  values(): IterableIterator<R[keyof R]>
  entries(): IterableIterator<YMapEntry<R>>
  forEach(fn: (key: keyof R, value: R[keyof R], self: YMap<R>) => void): void
  delete(key: OptionalKeyof<R>): void
  set<K extends keyof R, V extends R[K]>(key: K, value: V): V
  get<K extends keyof R>(key: K): R[K]
  has(key: keyof R): boolean
  toJSON(): {
    [K in keyof R]: JsonOf<R[K]>
  }
  [Symbol.iterator](): IterableIterator<YMapEntry<R>>
}

export type YMap<R extends YMapRecord> = Overwrite<Y.Map<R>, YMapType<R>>

export namespace YMap {
  export function from<R extends YMapRecord>(initialValue: R): YMap<R> {
    const yMap = new Y.Map() as unknown as YMap<R>
    for (const k in initialValue) {
      const v = initialValue[k]
      yMap.set(k, v)
    }
    return yMap
  }
}

// MARK: YDoc
type YDocRecord = Record<string, YType>

type YTypeConstructor<T extends YType> = new () => T extends YMap<any>
  ? YMap<any>
  : T extends YArray<any>
    ? YArray<any>
    : YText

type YDocType<R extends YDocRecord> = {
  get<K extends keyof R, TValue extends R[K]>(name: K, TypeConstructor: YTypeConstructor<TValue>): R[K]
  get<K extends keyof R>(name: K): R[K] | undefined

  getText<K extends ExtendsKeyof<R, YText>>(name: K): R[K]
  getArray<K extends ExtendsKeyof<R, YArray<any>>>(name: K): R[K]
  getMap<K extends ExtendsKeyof<R, YMap<any>>>(name: K): R[K]
}

// YDoc does not allow adding constructed YTypes, so we need to use DocSchema to define the top level structure of the YDoc
type DocSchema<R extends YDocRecord> = {
  [K in keyof R]: R[K] extends YText
    ? string
    : R[K] extends YArray<infer V>
      ? V[]
      : R[K] extends YMap<infer Record>
        ? Record
        : never
}

export type YDoc<R extends YDocRecord> = Overwrite<Y.Doc, YDocType<R>>

export namespace YDoc {
  export function from<R extends YDocRecord>(schema: DocSchema<R>): YDoc<R> {
    const yDoc = new Y.Doc()
    for (const key in schema) {
      const value = schema[key]
      if (typeof value === 'string') {
        const yText = yDoc.getText(key)
        yText.insert(0, value)
      } else if (Array.isArray(value)) {
        const yArray = yDoc.getArray(key)
        yArray.insert(0, value)
      } else if (typeof value === 'object') {
        const yMap = yDoc.getMap(key)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        for (const k in value as YMapRecord) {
          const v = value[k]
          yMap.set(k, v)
        }
      }
    }
    return yDoc as unknown as YDoc<R>
  }
}
