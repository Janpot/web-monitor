import {
  DeviceSelection,
  WebVitalsPercentiles,
  WebVitalsPeriod,
  WebVitalsValues,
} from '../../types';

const MATCH_ALL = { match_all: {} };

export function propertyFilter(property: string) {
  return {
    term: {
      property: { value: property },
    },
  };
}

export function deviceFilter(device: DeviceSelection = 'all') {
  return device === 'all'
    ? MATCH_ALL
    : {
        terms: {
          device:
            device === 'mobile'
              ? ['smartphone', 'tablet', 'phablet']
              : [device],
        },
      };
}

export function subtractPeriod(date: number, period: WebVitalsPeriod) {
  const periodInMs = 1000 * 60 * 60 * 24 * (period === 'day' ? 1 : 30);
  return date - periodInMs;
}

export function rangeFilter(start: number, end: number) {
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

export function periodFilter(end: number, period: WebVitalsPeriod) {
  return rangeFilter(subtractPeriod(end, period), end);
}

export function mapPercentiles(percentiles: any): WebVitalsPercentiles {
  return {
    p75: percentiles['75.0'],
    p90: percentiles['90.0'],
    p99: percentiles['99.0'],
  };
}

const PERCENTILES = ['75', '90', '99'] as const;

export function percentilesAggregation(field: string) {
  return {
    percentiles: {
      field,
      percents: PERCENTILES,
    },
  };
}

export function dateHistogram(end: number, period: WebVitalsPeriod) {
  return {
    field: '@timestamp',
    calendar_interval: period === 'day' ? '1h' : '1d',
    min_doc_count: 0, // adds missing buckets
    extended_bounds: {
      min: new Date(subtractPeriod(end, period)).toISOString(),
      max: new Date(end).toISOString(),
    },
  };
}

export function mapWebVitalsValues(aggs: any): WebVitalsValues {
  return {
    CLS: mapPercentiles(aggs.CLS.values),
    FCP: mapPercentiles(aggs.FCP.values),
    FID: mapPercentiles(aggs.FID.values),
    LCP: mapPercentiles(aggs.LCP.values),
    TTFB: mapPercentiles(aggs.TTFB.values),
  };
}
