import useSWROrig, { responseInterface } from 'swr';

function applyFn<R, P extends any[]>(
  fn: (...args: P) => R | Promise<R>,
  ...args: P
) {
  return fn(...args);
}

/**
 * Version of `useSWR`
 */
export function useSwrFn<R, P extends any[], E = any>(
  key: null | P,
  fn: (...args: P) => R | Promise<R>
): responseInterface<R, E> {
  return useSWROrig(key && [fn, ...key], applyFn) as responseInterface<R, E>;
}
