import { invariant } from '../invariant';

interface Lib {
  [medium: string]: {
    [source: string]: {
      domains: string[];
      parameters?: string[];
    };
  };
}

interface SourceConfig {
  name: string;
  medium: string;
  parameters: string[];
}

type PathnameIndex = Map<string, SourceConfig>;
type HostnameIndex = Map<string, PathnameIndex>;

export function buildIndex(lib: Lib): HostnameIndex {
  const result: HostnameIndex = new Map();

  for (const [medium, configs] of Object.entries(lib)) {
    for (const [source, config] of Object.entries(configs) as [
      string,
      Lib[string][string]
    ][]) {
      for (const urlPattern of config.domains) {
        const { hostname, pathname } = new URL(`http://${urlPattern}`);
        invariant(!!hostname, `Invalid url pattern "${urlPattern}"`);
        let pathnameIndex = result.get(hostname);
        if (!pathnameIndex) {
          pathnameIndex = new Map();
          result.set(hostname, pathnameIndex);
        }
        pathnameIndex.set(pathname, {
          name: source,
          medium,
          parameters: config.parameters || [],
        });
      }
    }
  }
  return result;
}

function findPathnameIndex(
  index: HostnameIndex,
  hostname: string
): PathnameIndex | undefined {
  const segments = hostname.split('.');
  for (let i = 0; i < segments.length; i++) {
    const testedHostSuffix = segments.slice(i).join('.');
    const node = index.get(testedHostSuffix);
    if (node) {
      return node;
    }
  }
  return undefined;
}

function findRefererByPathname(
  index: PathnameIndex,
  pathname: string
): SourceConfig | undefined {
  const segments = pathname.split('/').slice(1);
  for (let i = segments.length; i >= 0; i--) {
    const testedPathPrefix = '/' + segments.slice(0, i).join('/');
    const node = index.get(testedPathPrefix);
    if (node) {
      return node;
    }
  }
  return undefined;
}

function getSearchTerm(config: SourceConfig, referer: URL): string | undefined {
  for (const parameter of config.parameters) {
    const value = referer.searchParams.get(parameter);
    if (value) {
      return value;
    }
  }
}

interface ParseResult {
  href: string;
  medium: string;
  source: string;
  term?: string;
}

export function parse(
  index: HostnameIndex,
  referer: URL
): ParseResult | undefined {
  const pathnameIndex = findPathnameIndex(index, referer.hostname);
  if (!pathnameIndex) {
    return undefined;
  }
  const config = findRefererByPathname(pathnameIndex, referer.pathname);
  if (!config) {
    return undefined;
  }
  const term = getSearchTerm(config, referer);
  return {
    href: referer.href,
    medium: config.medium,
    source: config.name,
    ...(term ? { term } : {}),
  };
}
