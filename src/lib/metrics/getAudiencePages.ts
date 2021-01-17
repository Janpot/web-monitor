import { Client } from '@elastic/elasticsearch';
import {
  DeviceSelection,
  WebVitalsPeriod,
  AudiencePagesData,
  AudiencePagesOrder,
} from '../../types';
import { propertyFilter, deviceFilter, periodFilter } from './utils';

function getAggregationOrder(order: AudiencePagesOrder) {
  switch (order.column) {
    case 'pageviews':
      return { ['pageview_count.value']: order.direction };
    case 'duration':
      return { ['avg_visible.value']: order.direction };
    default:
      throw new Error(`Invalid order column "${order.column}"`);
  }
}

interface GetAudiencePagesParams {
  property: string;
  period?: WebVitalsPeriod;
  device?: DeviceSelection;
  order?: AudiencePagesOrder;
}

export default async function getAudiencePages(
  client: Client,
  {
    property,
    device = 'all',
    period = 'day',
    order = { column: 'pageviews', direction: 'desc' },
  }: GetAudiencePagesParams
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
              min_doc_count: order.direction === 'asc' ? 1 : 5,
              order: getAggregationOrder(order),
            },
            aggs: {
              pageview_count: {
                value_count: { field: 'session' },
              },
              avg_visible: {
                avg: { field: 'visible' },
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
      duration: bucket.avg_visible.value,
    })),
  };
}
