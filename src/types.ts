export interface SerializedPageMetrics {
  property: string;
  id: string;
  url: string;
  offset: number;
  CLS?: number;
  FCP?: number;
  FID?: number;
  LCP?: number;
  TTFB?: number;
}
