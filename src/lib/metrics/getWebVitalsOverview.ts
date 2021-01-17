import { Client } from '@elastic/elasticsearch';
import {
  WebVitalsPeriod,
  DeviceSelection,
  WebVitalsOverviewData,
} from '../../types';
import {
  subtractPeriod,
  propertyFilter,
  deviceFilter,
  periodFilter,
  percentilesAggregation,
  dateHistogram,
  mapWebVitalsValues,
} from './utils';

interface GetWebVitalsOverviewParams {
  property: string;
  period?: WebVitalsPeriod;
  device?: DeviceSelection;
}

export default async function getWebVitalsOverview(
  client: Client,
  { property, device = 'mobile', period = 'day' }: GetWebVitalsOverviewParams
): Promise<WebVitalsOverviewData> {
  const now = Date.now();
  const currentStart = subtractPeriod(now, period);
  const response = await client.search({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: {
      query: {
        bool: {
          filter: [propertyFilter(property), deviceFilter(device)],
        },
      },
      size: 0,
      aggs: {
        current: {
          filter: periodFilter(now, period),
          aggs: {
            FCP: percentilesAggregation('FCP'),
            LCP: percentilesAggregation('LCP'),
            FID: percentilesAggregation('FID'),
            TTFB: percentilesAggregation('TTFB'),
            CLS: percentilesAggregation('CLS'),
            histogram: {
              date_histogram: dateHistogram(now, period),
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
          filter: periodFilter(currentStart, period),
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
