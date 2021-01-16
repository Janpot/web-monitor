import { Client } from '@elastic/elasticsearch';
import { WebVitalsDevice, WebVitalsPeriod, AudienceMetric } from '../../types';
import { invariant } from '../invariant';
import { mapAudienceOverviewAggregations } from './getAudienceOverview';
import { propertyFilter, deviceFilter, periodFilter } from './utils';

function getOrder(metric: AudienceMetric): string {
  switch (metric) {
    case 'pageviews':
      return 'pageview_count.value';
    case 'sessions':
      return 'session_count.value';
    case 'duration':
      return 'avg_visible.value';
    case 'bounceRate':
      return 'bounce_rate.value';
    default:
      invariant(false, `Invalid metric "${metric}"`);
  }
}

interface GetAudiencePagesParams {
  property: string;
  metric: AudienceMetric;
  period?: WebVitalsPeriod;
  device?: WebVitalsDevice;
}

export default async function getAudiencePages(
  client: Client,
  { property, metric, device, period = 'day' }: GetAudiencePagesParams
) {
  const end = Date.now();
  const response = await client
    .search({
      index: `${process.env.INDEX_PREFIX}-pagemetrics`,
      body: {
        query: {
          bool: {
            filter: [
              propertyFilter(property),
              device ? deviceFilter(device) : { match_all: {} },
              periodFilter(end, period),
            ],
          },
        },
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
                [getOrder(metric)]: 'desc',
              },
            },
            aggs: {
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
              bounce_rate: {
                bucket_script: {
                  buckets_path: {
                    unbouncedSessions:
                      'returning_pageviews>unique_sessions.value',
                    sessions: 'session_count.value',
                  },
                  script: '1 - params.unbouncedSessions / params.sessions',
                },
              },
            },
          },
        },
      },
    })
    .catch((err) => {
      console.log(JSON.stringify(err.meta.body, null, 2));
      throw err;
    });

  return {
    pages: response.body.aggregations.pages.buckets.map((bucket: any) => ({
      samples: bucket.doc_count,
      page: bucket.key,
      ...mapAudienceOverviewAggregations(bucket),
    })),
  };
}
