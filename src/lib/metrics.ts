import { Client } from '@elastic/elasticsearch';
import { SerializedPageMetrics, WebVitalsDevice } from '../types';

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
            min_age: '7d',
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
      location: {
        properties: {
          href: { type: 'keyword' },
          protocol: { type: 'keyword' },
          host: { type: 'keyword' },
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
  // update mappiong for existing indices
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

export interface SerializedPageServerMetrics {
  browser?: string;
  device?: string;
  protocol: string;
  host: string;
  pathname: string;
}

export async function addMetric(
  metric: SerializedPageMetrics & SerializedPageServerMetrics
): Promise<void> {
  await ensureInitialized();

  const { offset, url, protocol, host, pathname, ...event } = metric;
  const location = {
    href: url,
    protocol,
    host,
    pathname,
  };

  const eventTimestamp = Date.now() + offset;
  await client.index({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: {
      '@timestamp': new Date(eventTimestamp).toISOString(),
      ...event,
      location,
    },
  });
}

const PERCENTILES = ['75', '90', '99'] as const;
interface Percentiles {
  '75.0': number | null;
  '90.0': number | null;
  '99.0': number | null;
}

export interface ChartData {
  FCP_percentiles: { values: Percentiles };
  LCP_percentiles: { values: Percentiles };
  FID_percentiles: { values: Percentiles };
  TTFB_percentiles: { values: Percentiles };
  CLS_percentiles: { values: Percentiles };
  histogram: {
    buckets: {
      FCP_percentiles: { values: Percentiles };
      LCP_percentiles: { values: Percentiles };
      FID_percentiles: { values: Percentiles };
      TTFB_percentiles: { values: Percentiles };
      CLS_percentiles: { values: Percentiles };
      key: number;
    }[];
  };
}

interface GetChartsOptions {
  device: WebVitalsDevice;
}

export async function getCharts(
  property: string,
  { device }: GetChartsOptions
): Promise<ChartData> {
  const end = Date.now();
  const start = end - 1000 * 60 * 60 * 24 * 7;
  const response = await client.search({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                property: { value: property },
              },
            },
            device
              ? {
                  terms: {
                    device:
                      device === 'mobile'
                        ? ['smartphone', 'tablet', 'phablet']
                        : [device],
                  },
                }
              : { match_all: {} },
            {
              range: {
                '@timestamp': {
                  gte: new Date(start).toISOString(),
                  lte: new Date(end).toISOString(),
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
        },
      },
      size: 0,
      aggs: {
        FCP_percentiles: {
          percentiles: {
            field: 'FCP',
            percents: PERCENTILES,
          },
        },
        LCP_percentiles: {
          percentiles: {
            field: 'LCP',
            percents: PERCENTILES,
          },
        },
        FID_percentiles: {
          percentiles: {
            field: 'FID',
            percents: PERCENTILES,
          },
        },
        TTFB_percentiles: {
          percentiles: {
            field: 'TTFB',
            percents: PERCENTILES,
          },
        },
        CLS_percentiles: {
          percentiles: {
            field: 'CLS',
            percents: PERCENTILES,
          },
        },
        histogram: {
          date_histogram: {
            field: '@timestamp',
            calendar_interval: '1d',
            min_doc_count: 0, // adds missing buckets
            extended_bounds: {
              min: new Date(start).toISOString(),
              max: new Date(end).toISOString(),
            },
          },
          aggs: {
            FCP_percentiles: {
              percentiles: {
                field: 'FCP',
                percents: PERCENTILES,
              },
            },
            LCP_percentiles: {
              percentiles: {
                field: 'LCP',
                percents: PERCENTILES,
              },
            },
            FID_percentiles: {
              percentiles: {
                field: 'FID',
                percents: PERCENTILES,
              },
            },
            TTFB_percentiles: {
              percentiles: {
                field: 'TTFB',
                percents: PERCENTILES,
              },
            },
            CLS_percentiles: {
              percentiles: {
                field: 'CLS',
                percents: PERCENTILES,
              },
            },
          },
        },
      },
    },
  });
  return response.body.aggregations;
}
