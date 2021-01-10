import { Client } from '@elastic/elasticsearch';
import { AudienceSourcesData, WebVitalsPeriod } from '../../types';
import { propertyFilter, periodFilter } from './utils';
interface AudienceSourcesParams {
  property: string;
  period: WebVitalsPeriod;
}

export default async function getAudienceSources(
  client: Client,
  { property, period = 'day' }: AudienceSourcesParams
): Promise<AudienceSourcesData> {
  const now = Date.now();

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
        sources: {
          terms: {
            field: 'referral.source',
            size: 10,
          },
        },
      },
    },
  });

  const total = response.body.hits.total.value;

  const otherCount = response.body.aggregations.sources.sum_other_doc_count;

  return {
    total,
    sources: [
      ...response.body.aggregations.sources.buckets.map((bucket: any) => ({
        source: bucket.key,
        count: bucket.doc_count,
        percent: bucket.doc_count / total,
      })),
      ...(otherCount > 0
        ? [
            {
              source: 'Other',
              count: response.body.aggregations.sources.sum_other_doc_count,
              percent:
                response.body.aggregations.sources.sum_other_doc_count / total,
            },
          ]
        : []),
    ],
  };
}
