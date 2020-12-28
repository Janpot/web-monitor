import { Client } from '@elastic/elasticsearch';
import { SerializedPageMetrics } from '../types';

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
      url: { type: 'text' },
      protocol: { type: 'text' },
      host: { type: 'text' },
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

  const { offset, ...event } = metric;

  const eventTimestamp = Date.now() + offset;
  await client.index({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: {
      '@timestamp': new Date(eventTimestamp).toISOString(),
      ...event,
    },
  });
}

export interface ChartData {
  avg_FCP: { value: number };
  avg_LCP: { value: number };
  avg_FID: { value: number };
  avg_TTFB: { value: number };
  avg_CLS: { value: number };
  histogram: {
    buckets: {
      key: number;
      avg_FCP: { value: number };
      avg_LCP: { value: number };
      avg_FID: { value: number };
      avg_TTFB: { value: number };
      avg_CLS: { value: number };
    }[];
  };
}

export async function getCharts(property: string): Promise<ChartData> {
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
        avg_FCP: {
          avg: { field: 'FCP' },
        },
        avg_LCP: {
          avg: { field: 'LCP' },
        },
        avg_FID: {
          avg: { field: 'FID' },
        },
        avg_TTFB: {
          avg: { field: 'TTFB' },
        },
        avg_CLS: {
          avg: { field: 'CLS' },
        },
        histogram: {
          date_histogram: {
            field: '@timestamp',
            // TODO: change to '1d' as soon as we have some more data
            calendar_interval: '1h',
          },
          aggs: {
            avg_FCP: {
              avg: { field: 'FCP' },
            },
            avg_LCP: {
              avg: { field: 'LCP' },
            },
            avg_FID: {
              avg: { field: 'FID' },
            },
            avg_TTFB: {
              avg: { field: 'TTFB' },
            },
            avg_CLS: {
              avg: { field: 'CLS' },
            },
          },
        },
      },
    },
  });
  return response.body.aggregations;
}
