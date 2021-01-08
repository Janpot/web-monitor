import { Client } from '@elastic/elasticsearch';
import {
  SerializedPageMetrics,
  WebVitalsDevice,
  WebVitalsMetric,
  WebVitalsPeriod,
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
      // deprecated, don't want to sort PII
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

const PERCENTILES = ['75', '90', '99'] as const;

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
        propertyFilter(property),
        device ? deviceFilter(device) : { match_all: {} },
        rangeFilter(start, end),
      ],
    },
  };
}

function percentilesAggregation(field: WebVitalsMetric) {
  return {
    percentiles: {
      field,
      percents: PERCENTILES,
    },
  };
}

export interface WebVitalsPagesData {
  pages: {
    page: string;
    samples: number;
    percentiles: WebVitalsPercentiles;
  }[];
}

export async function getWebVitalsPages(
  property: string,
  metric: WebVitalsMetric,
  { device, period = 'day' }: GetWebVitalsParams
) {
  const end = Date.now();
  const periodInMs = 1000 * 60 * 60 * 24 * (period === 'day' ? 1 : 30);
  const start = end - periodInMs;
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
            percentiles: percentilesAggregation(metric),
          },
        },
      },
    },
  });
  return {
    pages: response.body.aggregations.pages.buckets.map((bucket: any) => ({
      samples: bucket.doc_count,
      page: bucket.key,
      percentiles: mapPercentiles(bucket.percentiles.values),
    })),
  };
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

interface VisitorsParams {
  period: WebVitalsPeriod;
}

export async function getVisitorsOverview(
  property: string,
  { period = 'day' }: VisitorsParams
): Promise<VisitorsOverviewData> {
  const end = Date.now();
  const periodInMs = 1000 * 60 * 60 * 24 * (period === 'day' ? 1 : 30);
  const start = end - periodInMs;
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
            calendar_interval: period === 'day' ? '1h' : '1d',
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

export interface WebVitalsPercentiles {
  p75: number | null;
  p90: number | null;
  p99: number | null;
}

interface WebVitalsValues {
  CLS: WebVitalsPercentiles;
  FCP: WebVitalsPercentiles;
  FID: WebVitalsPercentiles;
  LCP: WebVitalsPercentiles;
  TTFB: WebVitalsPercentiles;
}

interface WebVitalsBucket extends WebVitalsValues {
  timestamp: number;
}

export interface WebVitalsOverviewData {
  period: WebVitalsPeriod;
  device: WebVitalsDevice;
  current: WebVitalsValues;
  previous: WebVitalsValues;
  histogram: WebVitalsBucket[];
}

interface GetWebVitalsParams {
  period?: WebVitalsPeriod;
  device?: WebVitalsDevice;
}

function propertyFilter(property: string) {
  return {
    term: {
      property: { value: property },
    },
  };
}

function deviceFilter(device: WebVitalsDevice) {
  return {
    terms: {
      device:
        device === 'mobile' ? ['smartphone', 'tablet', 'phablet'] : [device],
    },
  };
}

function rangeFilter(start: number, end: number) {
  return {
    range: {
      '@timestamp': {
        gte: new Date(start).toISOString(),
        lte: new Date(end).toISOString(),
        format: 'strict_date_optional_time',
      },
    },
  };
}

function mapPercentiles(percentiles: any): WebVitalsPercentiles {
  return {
    p75: percentiles['75.0'],
    p90: percentiles['90.0'],
    p99: percentiles['99.0'],
  };
}

function mapWebVitalsValues(aggs: any): WebVitalsValues {
  return {
    CLS: mapPercentiles(aggs.CLS.values),
    FCP: mapPercentiles(aggs.FCP.values),
    FID: mapPercentiles(aggs.FID.values),
    LCP: mapPercentiles(aggs.LCP.values),
    TTFB: mapPercentiles(aggs.TTFB.values),
  };
}

export async function getWebVitalsOverview(
  property: string,
  { device = 'mobile', period = 'day' }: GetWebVitalsParams
): Promise<WebVitalsOverviewData> {
  const now = Date.now();
  const periodInMs = 1000 * 60 * 60 * 24 * (period === 'day' ? 1 : 30);
  const currentStart = now - periodInMs;
  const previousStart = currentStart - periodInMs;
  const response = await client.search({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: {
      query: {
        bool: {
          filter: [
            propertyFilter(property),
            device ? deviceFilter(device) : { match_all: {} },
          ],
        },
      },
      size: 0,
      aggs: {
        current: {
          filter: rangeFilter(currentStart, now),
          aggs: {
            FCP: percentilesAggregation('FCP'),
            LCP: percentilesAggregation('LCP'),
            FID: percentilesAggregation('FID'),
            TTFB: percentilesAggregation('TTFB'),
            CLS: percentilesAggregation('CLS'),
            histogram: {
              date_histogram: {
                field: '@timestamp',
                calendar_interval: period === 'day' ? '1h' : '1d',
                min_doc_count: 0, // adds missing buckets
                extended_bounds: {
                  min: new Date(currentStart).toISOString(),
                  max: new Date(now).toISOString(),
                },
              },
              aggs: {
                FCP: percentilesAggregation('FCP'),
                LCP: percentilesAggregation('LCP'),
                FID: percentilesAggregation('FID'),
                TTFB: percentilesAggregation('TTFB'),
                CLS: percentilesAggregation('CLS'),
              },
            },
          },
        },
        previous: {
          filter: rangeFilter(previousStart, currentStart),
          aggs: {
            FCP: percentilesAggregation('FCP'),
            LCP: percentilesAggregation('LCP'),
            FID: percentilesAggregation('FID'),
            TTFB: percentilesAggregation('TTFB'),
            CLS: percentilesAggregation('CLS'),
          },
        },
      },
    },
  });

  return {
    period,
    device,
    current: mapWebVitalsValues(response.body.aggregations.current),
    previous: mapWebVitalsValues(response.body.aggregations.previous),
    histogram: response.body.aggregations.current.histogram.buckets.map(
      (bucket: any) => ({
        timestamp: bucket.key,
        ...mapWebVitalsValues(bucket),
      })
    ),
  };
}
