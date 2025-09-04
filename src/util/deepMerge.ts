import type { Obj } from '../process/types.ts';

/**
 * Simple object check.
 */
export function isObject(item: unknown): item is Obj {
  return !!(item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep Object.assign objects
 */
export function mergeDeep<T extends Obj>(
  target: T,
  source: T,
): Required<T> {
  if (isObject(target) && isObject(source)) {
    Object.assign(target, source);
    for (const key in source) {
      if (isObject(source[key])) {
        const targetItem = target[key];
        // @ts-expect-error normal higher-kinded type error
        if (!targetItem) target[key] = {};
        if (!isObject(targetItem)) {
          throw new Error(
            `Type mismatch: ${key} differs, target has ${targetItem} but source.${key} is an object`,
          );
        }
        mergeDeep(targetItem, source[key]);
      }
    }
  }
  return target as Required<T>;
}
