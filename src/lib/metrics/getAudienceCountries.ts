import { Client } from '@elastic/elasticsearch';
import {
  AudienceCountriesData,
  DeviceSelection,
  WebVitalsPeriod,
} from '../../types';
import { propertyFilter, periodFilter, deviceFilter } from './utils';
import { alpha2ToNumeric, getName } from 'i18n-iso-countries';

interface AudienceCountriesParams {
  property: string;
  period?: WebVitalsPeriod;
  device?: DeviceSelection;
}

export default async function getAudienceCountries(
  client: Client,
  { property, period = 'day', device = 'all' }: AudienceCountriesParams
): Promise<AudienceCountriesData> {
  const now = Date.now();

  const response = await client.search({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: {
      query: {
        bool: {
          filter: [
            propertyFilter(property),
            deviceFilter(device),
            periodFilter(now, period),
          ],
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
