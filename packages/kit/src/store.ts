// Every game shares one web address, so keys get a prefix to stay out of other pages' way.
const PREFIX = 'playroom:';

/**
 * Per-device conveniences such as best scores. Storage can be missing, full or
 * blocked, so nothing here ever throws: get falls back and set quietly gives up.
 */
export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const saved = localStorage.getItem(PREFIX + key);
      return saved === null ? fallback : (JSON.parse(saved) as T);
    } catch {
      return fallback;
    }
  },

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Nothing to do: the game simply forgets this next time.
    }
  },
};
