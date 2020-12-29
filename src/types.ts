export interface SerializedPageMetrics {
  property: string;
  url: string;
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
}

export type WebVitalsMetric = 'FCP' | 'LCP' | 'FID' | 'TTFB' | 'CLS';
