export function getValue(
  query: { [key: string]: string | string[] | undefined },
  name: string
): string | undefined {
  const value = query[name];
  return typeof value === 'string'
    ? value
    : Array.isArray(value)
    ? value[0]
    : undefined;
}

export function getValues(
  query: { [key: string]: string | string[] | undefined },
  name: string
): string[] | undefined {
  const value = query[name];
  return typeof value === 'string'
    ? [value]
    : Array.isArray(value)
    ? value
    : undefined;
}
