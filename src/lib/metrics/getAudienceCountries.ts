import { Client } from '@elastic/elasticsearch';
import { AudienceCountriesData, WebVitalsPeriod } from '../../types';
import { propertyFilter, periodFilter } from './utils';
import { alpha2ToNumeric, getName } from 'i18n-iso-countries';

interface AudienceSourcesParams {
  property: string;
  period: WebVitalsPeriod;
}

export default async function getAudienceSources(
  client: Client,
  { property, period = 'day' }: AudienceSourcesParams
): Promise<AudienceCountriesData> {
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
            field: 'country',
          },
        },
      },
    },
  });

  const total = response.body.hits.total.value;

  return {
    total,
    countries: response.body.aggregations.sources.buckets.map(
      (bucket: any) => ({
        code: bucket.key,
        numeric: alpha2ToNumeric(bucket.key),
        displayName: getName(bucket.key, 'en', { select: 'official' }),
        count: bucket.doc_count,
        percent: bucket.doc_count / total,
      })
    ),
  };
}
