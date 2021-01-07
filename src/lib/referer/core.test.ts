/** eslint-env jest */
import { buildIndex, parse } from './core';

const INDEX = buildIndex({
  fooMedium: {
    fooSource: {
      domains: ['hello.com', 'world.foo.bar/hello'],
    },
  },
  barMedium: {
    barSource: {
      domains: ['domainx.com'],
    },
  },
  bazMedium: {
    searchEngine: {
      domains: ['searchme.com'],
      parameters: ['q', 'query'],
    },
  },
});

test.each([
  ['http://hello.com', 'fooSource', 'fooMedium', null],
  ['http://sub.hello.com', 'fooSource', 'fooMedium', null],
  ['http://sub.andanother.hello.com', 'fooSource', 'fooMedium', null],
  ['http://world.foo.bar', null, null, null],
  ['http://world.foo.bar/hello', 'fooSource', 'fooMedium', null],
  ['http://world.foo.bar/wat', null, null, null],
  ['http://world.foo.bar/hello/wat', 'fooSource', 'fooMedium', null],
  ['http://domainx.com/hello', 'barSource', 'barMedium', null],
  [
    'http://searchme.com/search?query=hello&q=world',
    'searchEngine',
    'bazMedium',
    'world',
  ],
  [
    'http://searchme.com/search?query=world',
    'searchEngine',
    'bazMedium',
    'world',
  ],
  ['http://searchme.com/search?other=bs', 'searchEngine', 'bazMedium', null],
])(
  '%s => medium: %s, source %s',
  (referer, expectedSource, expectedMedium, expectedTerm) => {
    const result = parse(INDEX, new URL(referer));
    if (expectedSource === null) {
      expect(result).toBeUndefined();
    } else {
      expect(result).toHaveProperty('source', expectedSource);
      expect(result).toHaveProperty('medium', expectedMedium);
      if (expectedTerm === null) {
        expect(result).not.toHaveProperty('term');
      } else {
        expect(result).toHaveProperty('term', expectedTerm);
      }
    }
  }
);
