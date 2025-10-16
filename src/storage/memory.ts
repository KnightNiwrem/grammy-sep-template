import { BaseStorageAdapter } from "./base.ts";

interface MemoryEntry<T> {
  value: T;
  expiresAt?: number;
}

export interface MemoryStorageOptions {
  ttlMilliseconds?: number;
}

export class MemoryStorageAdapter<T> extends BaseStorageAdapter<T> {
  private readonly store = new Map<string, MemoryEntry<T>>();

  constructor(private readonly options: MemoryStorageOptions = {}) {
    super();
  }

  read(key: string) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  write(key: string, value: T) {
    const expiresAt = this.computeExpiry();
    this.store.set(key, { value, expiresAt });
  }

  delete(key: string) {
    this.store.delete(key);
  }

  override has(key: string) {
    return this.read(key) !== undefined;
  }

  override readAllKeys() {
    return this.iterateKeys();
  }

  override readAllValues() {
    return this.iterateValues();
  }

  override readAllEntries() {
    return this.iterateEntries();
  }

  private computeExpiry() {
    if (!this.options.ttlMilliseconds) return undefined;
    const ttl = this.options.ttlMilliseconds;
    if (ttl === Infinity) return undefined;
    return Date.now() + ttl;
  }

  private *iterateKeys() {
    for (const key of this.store.keys()) {
      if (this.read(key) !== undefined) yield key;
    }
  }

  private *iterateValues() {
    for (const key of this.store.keys()) {
      const value = this.read(key);
      if (value !== undefined) yield value;
    }
  }

  private *iterateEntries() {
    for (const key of this.store.keys()) {
      const value = this.read(key);
      if (value !== undefined) yield [key, value] as [string, T];
    }
  }
}
