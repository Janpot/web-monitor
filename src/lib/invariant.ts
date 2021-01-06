export function invariant(test: boolean, msg: string): asserts test {
  if (!test) {
    throw new Error(msg);
  }
}
