import { Client } from '@elastic/elasticsearch';
import { SerializedPageMetrics } from '../../types';

/**
 * Time (in ms) after which a user's session expires if no new visits
 * for their IP are recorded
 */
const SESSION_LIFETIME = 1000 * 60 * 30;

if (!process.env.ELASTICSEARCH_NODE) {
  throw new Error('Missing env variable "ELASTICSEARCH_NODE"');
} else if (!process.env.INDEX_PREFIX) {
  throw new Error('Missing env variable "INDEX_PREFIX"');
} else if (!process.env.ELASTICSEARCH_USERNAME) {
  throw new Error('Missing env variable "ELASTICSEARCH_USERNAME"');
} else if (!process.env.ELASTICSEARCH_PASSWORD) {
  throw new Error('Missing env variable "ELASTICSEARCH_PASSWORD"');
}

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE,
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },
});

async function initialize() {
  const policyName = `${process.env.INDEX_PREFIX}-pagemetrics-policy`;
  await client.ilm.putLifecycle({
    policy: policyName,
    body: {
      policy: {
        phases: {
          hot: {
            actions: {
              rollover: {
                max_size: '25GB',
                max_age: '1d',
              },
            },
          },
          delete: {
            min_age: '30d',
            actions: {
              delete: {},
            },
          },
        },
      },
    },
  });
  const mapping = {
    dynamic: false,
    properties: {
      property: { type: 'keyword' },
      browser: { type: 'keyword' },
      device: { type: 'keyword' },
      connection: { type: 'keyword' },
      ip: { type: 'keyword' },
      country: { type: 'keyword' },
      session: { type: 'keyword' },
      isNewSession: { type: 'boolean' },
      referrer: { type: 'keyword' },
      // deprecated, let's use the wrong spelling
      referral: {
        properties: {
          href: { type: 'keyword' },
          source: { type: 'keyword' },
          medium: { type: 'keyword' },
          term: { type: 'keyword' },
          campaign: { type: 'keyword' },
          content: { type: 'keyword' },
        },
      },
      location: {
        properties: {
          href: { type: 'keyword' },
          host: { type: 'keyword' },
          // deprecated, didn't need this
          protocol: { type: 'keyword' },
          // deprecated, didn't need this
          pathname: { type: 'keyword' },
        },
      },
      // deprecated, we really didn't need text search here
      url: { type: 'text' },
      // deprecated, we really didn't need text search here
      protocol: { type: 'text' },
      // deprecated, we really didn't need text search here
      host: { type: 'text' },
      // deprecated, we really didn't need text search here
      pathname: { type: 'text' },
      visible: { type: 'double' },
      CLS: { type: 'double' },
      FCP: { type: 'double' },
      FID: { type: 'double' },
      LCP: { type: 'double' },
      TTFB: { type: 'double' },
    },
  };
  await client.indices.putIndexTemplate({
    name: `${process.env.INDEX_PREFIX}-pagemetrics-template`,
    body: {
      index_patterns: [`${process.env.INDEX_PREFIX}-pagemetrics`],
      data_stream: {},
      priority: 200,
      template: {
        settings: {
          'index.lifecycle.name': policyName,
        },
        mappings: mapping,
      },
    },
  });
  // update mapping for existing indices
  await client.indices.putMapping({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: mapping,
  });
}

let initPromise: Promise<void> | null = null;
async function ensureInitialized() {
  if (!initPromise) {
    initPromise = initialize();
  }
  await initPromise;
}

export interface Location {
  href: string;
  host: string;
}

export interface Referral {
  href?: string;
  source?: string;
  medium?: string;
  term?: string;
  campaign?: string;
  content?: string;
}

export interface SerializedPageServerMetrics {
  timestamp: number;
  browser?: string;
  device?: string;
  location: Location;
  ip?: string;
  session: string;
  isNewSession: boolean;
  country?: string;
  referral?: Referral;
}

export async function getSession(
  property: string,
  ip: string,
  timestamp = Date.now()
): Promise<string | undefined> {
  const { body } = await client.search({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: {
      size: 1,
      query: {
        bool: {
          filter: [
            {
              term: {
                property: { value: property },
              },
            },
            {
              term: {
                ip: { value: ip },
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: new Date(timestamp - SESSION_LIFETIME).toISOString(),
                  lte: new Date(timestamp + SESSION_LIFETIME).toISOString(),
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
        },
      },
      docvalue_fields: ['session'],
      _source: false,
    },
  });
  return body.hits.hits.length > 0
    ? body.hits.hits[0].fields.session[0]
    : undefined;
}

export async function addMetric(
  metric: Omit<SerializedPageMetrics, 'url' | 'offset'> &
    SerializedPageServerMetrics
): Promise<void> {
  await ensureInitialized();

  const { timestamp, ...event } = metric;

  await client.index({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: {
      '@timestamp': timestamp,
      ...event,
    },
  });
}

export function getClient() {
  return client;
}

export { default as getAudienceOverview } from './getAudienceOverview';
export { default as getAudienceCountries } from './getAudienceCountries';
export { default as getAudiencePages } from './getAudiencePages';

export { default as getWebVitalsOverview } from './getWebVitalsOverview';
export { default as getWebVitalsPages } from './getWebVitalsPages';

export { default as getReferralsSources } from './getReferralsSources';
