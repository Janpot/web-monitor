import { Client } from '@elastic/elasticsearch';
import { WebVitalsMetric, DeviceSelection, WebVitalsPeriod } from '../../types';
import {
  propertyFilter,
  deviceFilter,
  periodFilter,
  percentilesAggregation,
  mapPercentiles,
} from './utils';

interface GetWebVitalsPagesParams {
  property: string;
  metric: WebVitalsMetric;
  period?: WebVitalsPeriod;
  device?: DeviceSelection;
}

export default async function getWebVitalsPages(
  client: Client,
  { property, metric, device = 'all', period = 'day' }: GetWebVitalsPagesParams
) {
  const end = Date.now();
  const response = await client.search({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: {
      query: {
        bool: {
          filter: [
            propertyFilter(property),
            deviceFilter(device),
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
