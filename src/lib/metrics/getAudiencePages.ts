import { Client } from '@elastic/elasticsearch';
import {
  DeviceSelection,
  WebVitalsPeriod,
  AudiencePagesData,
} from '../../types';
import { propertyFilter, deviceFilter, periodFilter } from './utils';

interface GetAudiencePagesParams {
  property: string;
  period?: WebVitalsPeriod;
  device?: DeviceSelection;
}

export default async function getAudiencePages(
  client: Client,
  { property, device = 'all', period = 'day' }: GetAudiencePagesParams
): Promise<AudiencePagesData> {
  const end = Date.now();
  const response = await client
    .search({
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
                ['pageview_count.value']: 'desc',
              },
            },
            aggs: {
              pageview_count: {
                value_count: { field: 'session' },
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
      pageviews: bucket.pageview_count.value,
    })),
  };
}
