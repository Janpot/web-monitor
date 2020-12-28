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

const METRICS = {
  FCP: {
    title: 'First Contentful Paint',
    target: 1000,
  },
  LCP: {
    title: 'Largest Contentful Paint ',
    target: 2500,
  },
  FID: {
    title: 'First Input Delay',
    target: 100,
  },
  TTFB: {
    title: 'Time to First Byte',
    target: 600,
  },
  CLS: {
    title: 'Cumulative Layout Shift',
    target: 0.1,
  },
};

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
  FCP_p75: { value: number };
  LCP_p75: { value: number };
  FID_p75: { value: number };
  TTFB_p75: { value: number };
  CLS_p75: { value: number };
  histogram: {
    buckets: {
      FCP_p75: { value: number };
      LCP_p75: { value: number };
      FID_p75: { value: number };
      TTFB_p75: { value: number };
      CLS_p75: { value: number };
      key: number;
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
        FCP_p75: {
          percentiles: {
            field: 'FCP',
            percents: [75],
          },
        },
        LCP_p75: {
          percentiles: {
            field: 'LCP',
            percents: [75],
          },
        },
        FID_p75: {
          percentiles: {
            field: 'FID',
            percents: [75],
          },
        },
        TTFB_p75: {
          percentiles: {
            field: 'TTFB',
            percents: [75],
          },
        },
        CLS_p75: {
          percentiles: {
            field: 'CLS',
            percents: [75],
          },
        },
        histogram: {
          date_histogram: {
            field: '@timestamp',
            // TODO: change to '1d' as soon as we have some more data
            calendar_interval: '1h',
          },
          aggs: {
            FCP_p75: {
              percentiles: {
                field: 'FCP',
                percents: [75],
              },
            },
            LCP_p75: {
              percentiles: {
                field: 'LCP',
                percents: [75],
              },
            },
            FID_p75: {
              percentiles: {
                field: 'FID',
                percents: [75],
              },
            },
            TTFB_p75: {
              percentiles: {
                field: 'TTFB',
                percents: [75],
              },
            },
            CLS_p75: {
              percentiles: {
                field: 'CLS',
                percents: [75],
              },
            },
          },
        },
      },
    },
  });
  return response.body.aggregations;
}
