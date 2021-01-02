import { Client } from '@elastic/elasticsearch';
import {
  SerializedPageMetrics,
  WebVitalsDevice,
  WebVitalsMetric,
} from '../types';

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
      ip: { type: 'keyword' },
      session: { type: 'keyword' },
      isNewSession: { type: 'boolean' },
      referrer: { type: 'keyword' },
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

export interface SerializedPageServerMetrics {
  timestamp: number;
  browser?: string;
  device?: string;
  location: Location;
  ip?: string;
  session: string;
  isNewSession: boolean;
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
  device?: WebVitalsDevice;
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
  device?: WebVitalsDevice;
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
      percentiles: { values: Percentiles };
    }[];
  };
}

export async function getWebVitalsPages(
  property: string,
  metric: WebVitalsMetric,
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
            // Let's make sure the result has some statistical relevance
            min_doc_count: 5,
            order: {
              // can't order by percentiles yet so let's do by average
              'metric.avg': 'desc',
            },
          },
          aggs: {
            metric: { stats: { field: metric } },
            percentiles: percentiles(metric),
          },
        },
      },
    },
  });
  return response.body.aggregations;
}

interface VisitorsOverviewMetrics {
  pageviews: number;
  sessions: number;
  duration: number;
  bounceRate: number;
}

interface VisitorsOverviewHistogramBucket extends VisitorsOverviewMetrics {
  timestamp: number;
}

export interface VisitorsOverviewData extends VisitorsOverviewMetrics {
  histogram: VisitorsOverviewHistogramBucket[];
}

function mapVisitorsOverviewAggregations(agg: any): VisitorsOverviewMetrics {
  const sessions = agg.session_count.value;
  const unouncedSessions = agg.returning_pageviews.unique_sessions.value;
  const bouncedSessions = sessions - unouncedSessions;
  return {
    pageviews: agg.pageview_count.value,
    sessions,
    duration: agg.avg_visible.value,
    bounceRate: bouncedSessions / sessions,
  };
}

export async function getVisitorsOverview(
  property: string
): Promise<VisitorsOverviewData> {
  const end = Date.now();
  const start = end - 1000 * 60 * 60 * 24 * 7;
  const aggregations = {
    session_count: {
      cardinality: { field: 'session' },
    },
    pageview_count: {
      value_count: { field: 'session' },
    },
    avg_visible: {
      avg: { field: 'visible' },
    },
    returning_pageviews: {
      filter: { term: { isNewSession: false } },
      aggs: {
        unique_sessions: {
          cardinality: { field: 'session' },
        },
      },
    },
  };

  const response = await client.search({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: {
      query: makeEsQuery({ start, end, property }),
      size: 0,
      aggs: {
        ...aggregations,
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
          aggs: aggregations,
        },
      },
    },
  });

  return {
    ...mapVisitorsOverviewAggregations(response.body.aggregations),
    histogram: response.body.aggregations.histogram.buckets.map(
      (bucket: any) => ({
        timestamp: bucket.key,
        ...mapVisitorsOverviewAggregations(bucket),
      })
    ),
  };
}
