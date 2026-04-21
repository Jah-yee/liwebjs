export class LiWebState {
  private store = new Map<string, unknown>();

  /**
   * Get a value by key.
   * Returns undefined if key does not exist.
   */
  get<T = unknown>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  /**
   * Overwrite a value completely.
   */
  set<T = unknown>(key: string, value: T): void {
    this.store.set(key, value);
  }

  /**
   * Functional update — receives current value, returns new value.
   * Throws if key does not exist.
   */
  update<T = unknown>(key: string, fn: (current: T) => T): void {
    if (!this.store.has(key)) {
      throw new Error(
        `[liwebjs] state.update: key "${key}" does not exist. Use state.set() to initialize it first.`
      );
    }
    this.store.set(key, fn(this.store.get(key) as T));
  }

  /**
   * Append an item to an array value.
   * Throws if value at key is not an array.
   */
  push<T = unknown>(key: string, item: T): void {
    const current = this.store.get(key);
    if (current === undefined) {
      this.store.set(key, [item]);
      return;
    }
    if (!Array.isArray(current)) {
      throw new Error(
        `[liwebjs] state.push: key "${key}" is not an array.`
      );
    }
    this.store.set(key, [...current, item]);
  }

  /**
   * Remove items from an array using a predicate.
   * Throws if value at key is not an array.
   */
  remove<T = unknown>(key: string, predicate: (item: T) => boolean): void {
    const current = this.store.get(key);
    if (current === undefined) return;
    if (!Array.isArray(current)) {
      throw new Error(
        `[liwebjs] state.remove: key "${key}" is not an array.`
      );
    }
    this.store.set(key, current.filter((item) => !predicate(item as T)));
  }

  /**
   * Increment a numeric value by step (default 1).
   * Initializes to 0 before incrementing if key does not exist.
   */
  increment(key: string, step = 1): void {
    const current = (this.store.get(key) as number) ?? 0;
    if (typeof current !== "number") {
      throw new Error(
        `[liwebjs] state.increment: key "${key}" is not a number.`
      );
    }
    this.store.set(key, current + step);
  }

  /**
   * Decrement a numeric value by step (default 1).
   * Initializes to 0 before decrementing if key does not exist.
   */
  decrement(key: string, step = 1): void {
    const current = (this.store.get(key) as number) ?? 0;
    if (typeof current !== "number") {
      throw new Error(
        `[liwebjs] state.decrement: key "${key}" is not a number.`
      );
    }
    this.store.set(key, current - step);
  }

  /**
   * Shallow-merge a partial object into an existing object value.
   * Throws if value at key is not a plain object.
   */
  patch<T extends Record<string, unknown>>(
    key: string,
    partial: Partial<T>
  ): void {
    const current = this.store.get(key);
    if (current === undefined) {
      this.store.set(key, { ...partial });
      return;
    }
    if (typeof current !== "object" || Array.isArray(current) || current === null) {
      throw new Error(
        `[liwebjs] state.patch: key "${key}" is not a plain object.`
      );
    }
    this.store.set(key, { ...(current as T), ...partial });
  }

  /**
   * Check if a key exists.
   */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /**
   * Delete a key entirely.
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all state in this room.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Snapshot of all current state — useful for sending
   * full state to a newly joined connection.
   */
  snapshot(): Record<string, unknown> {
    return Object.fromEntries(this.store.entries());
  }
}