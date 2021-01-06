// Run `yarn download-referers` to update
import lib from './referers.json';
import { buildIndex, parse as parseReferer } from './core';

const INDEX = buildIndex(lib);

export function parse(referer: URL) {
  return parseReferer(INDEX, referer);
}
