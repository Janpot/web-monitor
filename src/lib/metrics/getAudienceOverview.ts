import { Client } from '@elastic/elasticsearch';
import {
  AudienceOverviewData,
  AudienceOverviewMetrics,
  WebVitalsPeriod,
} from '../../types';
import { propertyFilter, periodFilter, dateHistogram } from './utils';

export function mapAudienceOverviewAggregations(
  agg: any
): AudienceOverviewMetrics {
  const sessions = agg.session_count.value;
  const unbouncedSessions = agg.returning_pageviews.unique_sessions.value;
  const bouncedSessions = sessions - unbouncedSessions;
  return {
    pageviews: agg.pageview_count.value,
    sessions,
    duration: agg.avg_visible.value,
    bounceRate: bouncedSessions / sessions,
  };
}

interface AudienceOverviewParams {
  property: string;
  period: WebVitalsPeriod;
}

export default async function getAudienceOverview(
  client: Client,
  { property, period = 'day' }: AudienceOverviewParams
): Promise<AudienceOverviewData> {
  const now = Date.now();
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
      query: {
        bool: {
          filter: [propertyFilter(property), periodFilter(now, period)],
        },
      },
      size: 0,
      aggs: {
        ...aggregations,
        histogram: {
          date_histogram: dateHistogram(now, period),
          aggs: aggregations,
        },
      },
    },
  });

  return {
    ...mapAudienceOverviewAggregations(response.body.aggregations),
    histogram: response.body.aggregations.histogram.buckets.map(
      (bucket: any) => ({
        timestamp: bucket.key,
        ...mapAudienceOverviewAggregations(bucket),
      })
    ),
  };
}
