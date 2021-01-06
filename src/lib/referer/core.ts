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
        const [, hostname, path = '/'] = /([^/]+)(.*)/.exec(urlPattern) || [];
        invariant(!!hostname, `Invalid url pattern "${urlPattern}"`);
        let pathnameIndex = findPathnameIndex(result, hostname);
        if (!pathnameIndex) {
          pathnameIndex = new Map();
          result.set(hostname, pathnameIndex);
        }
        pathnameIndex.set(path, {
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
  const segments = pathname.split('/');
  for (let i = segments.length; i > 0; i--) {
    const testedPathPrefix = segments.slice(0, i).join('/');
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
  medium: string;
  source: string;
  searchTerm: string | null;
}

export function parse(index: HostnameIndex, referer: URL): ParseResult | null {
  const pathnameIndex = findPathnameIndex(index, referer.hostname);
  if (!pathnameIndex) {
    return null;
  }
  const config = findRefererByPathname(pathnameIndex, referer.pathname);
  if (!config) {
    return null;
  }
  return {
    medium: config.medium,
    source: config.name,
    searchTerm: getSearchTerm(config, referer) || null,
  };
}
