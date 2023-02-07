import { uriMatch } from './uriMatch';

describe('uriMatch', () => {
  test('matches string', () => {
    expect(uriMatch('https://fwoa.com', 'https://fwoa.com')).toBe(true);
    expect(uriMatch('https://fwoa.com', 'something else')).toBe(false);
  });

  test('not a string', () => {
    expect(uriMatch('https://fwoa.com', [])).toBe(false);
    expect(uriMatch('https://fwoa.com', {})).toBe(false);
    expect(uriMatch('https://fwoa.com', 23.1)).toBe(false);
  });
});
