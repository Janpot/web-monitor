import useSWROrig, { responseInterface } from 'swr';

/**
 * Version of `useSWR` with tighter types
 */
export default function useSWR<R, P extends any[], E = any>(
  key: null | P,
  fn: (...args: P) => R | Promise<R>
): responseInterface<R, E> {
  return useSWROrig(key, fn);
}
