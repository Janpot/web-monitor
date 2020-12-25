export interface Metric {
  id: string;
  name: string;
  value: number;
}

export interface SerializedData {
  property: string;
  url: string;
  metrics: Metric[];
  duration: number;
}
