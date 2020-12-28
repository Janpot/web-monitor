import useSWR from 'swr';
import * as React from 'react';
import { ChartData } from '../lib/metrics';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Box, Paper } from '@material-ui/core';

const numberFormat = new Intl.NumberFormat();

interface MetricProps {
  name: string;
  value: number;
  histogram: {
    key: number;
    value: number;
  }[];
}

function Metric({ name, value, histogram }: MetricProps) {
  return (
    <Paper>
      <Box p={2} my={3}>
        {name}: {numberFormat.format(value)}
        <ResponsiveContainer height={200}>
          <LineChart data={histogram}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="key"
              domain={['auto', 'auto']}
              scale="time"
              type="number"
              tickFormatter={(unixTime) => new Date(unixTime).toLocaleString()}
            />
            <YAxis tickFormatter={numberFormat.format} />
            <Tooltip
              label={name}
              labelFormatter={(value) => new Date(value).toLocaleString()}
              formatter={(value) => numberFormat.format(value as number)}
            />
            <Line name={name} dataKey="value" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}

function metricProps(
  charts: ChartData,
  name: 'FCP' | 'LCP' | 'FID' | 'TTFB' | 'CLS'
) {
  return {
    name,
    value: charts[`${name}_p75` as const].values['75.0'],
    histogram: charts.histogram.buckets.map((bucket) => ({
      key: bucket.key,
      value: bucket[`${name}_p75` as const].values['75.0'],
    })),
  };
}

interface PropertyProps {
  id: string;
}

export default function PropertyPageContent({ id }: PropertyProps) {
  const { data: charts } = useSWR<ChartData>(`/api/data/${id}/charts`);
  return (
    <>
      {charts && (
        <>
          <Metric {...metricProps(charts, 'FCP')} />
          <Metric {...metricProps(charts, 'LCP')} />
          <Metric {...metricProps(charts, 'FID')} />
          <Metric {...metricProps(charts, 'TTFB')} />
          <Metric {...metricProps(charts, 'CLS')} />
        </>
      )}
    </>
  );
}
