export interface SerializedPageMetrics {
  property: string;
  url: string;
  connection?: string;
  offset: number;
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

export type WebVitalsMetric = 'FCP' | 'LCP' | 'FID' | 'TTFB' | 'CLS';
export type WebVitalsDevice = 'mobile' | 'desktop';
