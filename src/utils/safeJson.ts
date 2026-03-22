/**
 * Safely stringifies a JSON object, handling circular references.
 */
export const safeStringify = (obj: any, indent?: number): string => {
  const cache = new WeakSet();
  try {
    return JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return; // Discard circular reference
          }
          cache.add(value);
        }
        return value;
      },
      indent
    );
  } catch (err) {
    console.error("Critical error in safeStringify:", err);
    return JSON.stringify({ error: "Stringify failed" });
  }
};

/**
 * Safely parses a JSON string.
 */
export const safeParse = <T>(str: string | null | undefined, fallback: T): T => {
  if (!str) return fallback;
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    // Not a JSON object or array, return fallback without error logging
    return fallback;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch (e) {
    console.error(`Error parsing JSON (String starts with: ${trimmed.substring(0, 20)}...):`, e);
    return fallback;
  }
};
