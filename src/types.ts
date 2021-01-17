export interface SerializedPageMetrics {
  property: string;
  url: string;
  referrer?: string;
  connection?: string;
  duration: number;
  visible: number;
  CLS?: number;
  FCP?: number;
  FID?: number;
  LCP?: number;
  TTFB?: number;
}

export interface Property {
  id: string;
  name: string;
  ignoredQueryParams: string[];
}

export type WebVitalsPeriod = 'day' | 'month';
export type Device = 'mobile' | 'desktop';
export type DeviceSelection = Device | 'all';
export type OrderDirection = 'asc' | 'desc';

export type WebVitalsMetric = 'FCP' | 'LCP' | 'FID' | 'TTFB' | 'CLS';
export type AudienceMetric =
  | 'pageviews'
  | 'sessions'
  | 'duration'
  | 'bounceRate';

export interface AudienceOverviewMetrics {
  pageviews: number;
  sessions: number;
  duration: number;
  bounceRate: number;
}

export interface AudienceOverviewHistogramBucket
  extends AudienceOverviewMetrics {
  timestamp: number;
}

export interface AudiencePagesOrder {
  column: 'pageviews' | 'duration';
  direction: OrderDirection;
}

export interface AudiencePagesData {
  pages: {
    page: string;
    samples: number;
    pageviews: number;
    duration: number;
  }[];
}

export interface AudienceOverviewData extends AudienceOverviewMetrics {
  histogram: AudienceOverviewHistogramBucket[];
}

export interface AudienceCountriesBucket {
  code: string;
  numeric: string;
  displayName: string;
  count: number;
  percent: number;
}

export interface AudienceCountriesData {
  countries: AudienceCountriesBucket[];
  total: number;
}

export interface WebVitalsPercentiles {
  p75: number | null;
  p90: number | null;
  p99: number | null;
}

export interface WebVitalsValues {
  CLS: WebVitalsPercentiles;
  FCP: WebVitalsPercentiles;
  FID: WebVitalsPercentiles;
  LCP: WebVitalsPercentiles;
  TTFB: WebVitalsPercentiles;
}

export interface WebVitalsBucket extends WebVitalsValues {
  timestamp: number;
}

export interface WebVitalsOverviewData {
  period: WebVitalsPeriod;
  device: DeviceSelection;
  current: WebVitalsValues;
  previous: WebVitalsValues;
  histogram: WebVitalsBucket[];
}

export interface WebVitalsPagesData {
  pages: {
    page: string;
    samples: number;
    percentiles: WebVitalsPercentiles;
  }[];
}

export interface ReferralsSourcesBucket {
  source: string;
  count: number;
  percent: number;
}

export interface ReferralsSourcesData {
  sources: ReferralsSourcesBucket[];
  total: number;
}
