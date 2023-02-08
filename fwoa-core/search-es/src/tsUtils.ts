// eslint-disable-next-line import/prefer-default-export
export function isPresent<T>(t: T | undefined | void): t is T {
  return t !== undefined;
}
