import { Client } from '@elastic/elasticsearch';
import {
  SerializedPageMetrics,
  WebVitalsDevice,
  WebVitalsMetric,
} from '../types';

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
      connection: { type: 'keyword' },
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

export interface Location {
  href: string;
  host: string;
}

export interface SerializedPageServerMetrics {
  browser?: string;
  device?: string;
  location: Location;
}

export async function addMetric(
  metric: Omit<SerializedPageMetrics, 'url'> & SerializedPageServerMetrics
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
      key: number;
      doc_count: number;
      FCP_percentiles: { values: Percentiles };
      LCP_percentiles: { values: Percentiles };
      FID_percentiles: { values: Percentiles };
      TTFB_percentiles: { values: Percentiles };
      CLS_percentiles: { values: Percentiles };
    }[];
  };
}

interface MakeEsQueryOptions {
  start: number;
  end: number;
  property: string;
  device: WebVitalsDevice;
}

function makeEsQuery({ start, end, property, device }: MakeEsQueryOptions) {
  return {
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
  };
}

interface GetChartsOptions {
  device: WebVitalsDevice;
}

function percentiles(field: WebVitalsMetric) {
  return {
    percentiles: {
      field,
      percents: PERCENTILES,
    },
  };
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
      query: makeEsQuery({ start, end, property, device }),
      size: 0,
      aggs: {
        FCP_percentiles: percentiles('FCP'),
        LCP_percentiles: percentiles('LCP'),
        FID_percentiles: percentiles('FID'),
        TTFB_percentiles: percentiles('TTFB'),
        CLS_percentiles: percentiles('CLS'),
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
            FCP_percentiles: percentiles('FCP'),
            LCP_percentiles: percentiles('LCP'),
            FID_percentiles: percentiles('FID'),
            TTFB_percentiles: percentiles('TTFB'),
            CLS_percentiles: percentiles('CLS'),
          },
        },
      },
    },
  });
  return response.body.aggregations;
}

export interface WebVitalsPagesData {
  pages: {
    buckets: {
      key: string;
      doc_count: number;
      FCP_percentiles: { values: Percentiles };
      LCP_percentiles: { values: Percentiles };
      FID_percentiles: { values: Percentiles };
      TTFB_percentiles: { values: Percentiles };
      CLS_percentiles: { values: Percentiles };
    }[];
  };
}

export async function getWebVitalsPages(
  property: string,
  { device }: GetChartsOptions
) {
  const end = Date.now();
  const start = end - 1000 * 60 * 60 * 24 * 7;
  const response = await client.search({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: {
      query: makeEsQuery({ start, end, property, device }),
      size: 0,
      aggs: {
        pages: {
          terms: {
            field: 'location.href',
            size: 10,
          },
          aggs: {
            FCP_percentiles: percentiles('FCP'),
            LCP_percentiles: percentiles('LCP'),
            FID_percentiles: percentiles('FID'),
            TTFB_percentiles: percentiles('TTFB'),
            CLS_percentiles: percentiles('CLS'),
          },
        },
      },
    },
  });
  return response.body.aggregations;
}
