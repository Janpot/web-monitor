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
  ReferenceLine,
} from 'recharts';
import {
  Box,
  Divider,
  MenuItem,
  Paper,
  Select,
  Toolbar,
  Typography,
  useTheme,
} from '@material-ui/core';
import { Property, WebVitalsMetric } from '../types';
import Link from './Link';

type Percentile = '75.0' | '90.0' | '99.0';

interface MetricDescriptor {
  title: string;
  description: string;
  link: string;
  format: (value: number) => string;
  unit?: 'ms' | 's';
  target: number;
}

const numberFormat = new Intl.NumberFormat('en');
const numberFormatSeconds = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
});
const numberFormatMilliseconds = new Intl.NumberFormat('en', {
  maximumFractionDigits: 0,
});

const METRICS = {
  FCP: {
    title: 'First Contentful Paint',
    description:
      "measures the time from when the page starts loading to when any part of the page's content is rendered on the screen.",
    link: 'https://web.dev/fcp',
    format: (value) => numberFormatSeconds.format(value / 1000),
    unit: 's',
    target: 1000,
  } as MetricDescriptor,
  LCP: {
    title: 'Largest Contentful Paint ',
    description:
      'measures loading performance. To provide a good user experience, LCP should occur within 2.5 seconds of when the page first starts loading.',
    link: 'https://web.dev/lcp',
    format: (value) => numberFormatSeconds.format(value / 1000),
    unit: 's',
    target: 2500,
  } as MetricDescriptor,
  FID: {
    title: 'First Input Delay',
    description:
      'measures interactivity. To provide a good user experience, pages should have a FID of less than 100 milliseconds.',
    link: 'https://web.dev/fid',
    format: numberFormatMilliseconds.format,
    unit: 'ms',
    target: 100,
  } as MetricDescriptor,
  TTFB: {
    title: 'Time to First Byte',
    description:
      "the time that it takes for a user's browser to receive the first byte of page content",
    link: 'https://web.dev/time-to-first-byte',
    format: numberFormatMilliseconds.format,
    unit: 'ms',
    target: 600,
  } as MetricDescriptor,
  CLS: {
    title: 'Cumulative Layout Shift',
    description:
      'measures visual stability. To provide a good user experience, pages should maintain a CLS of less than 0.1.',
    link: 'https://web.dev/cls',
    format: numberFormat.format,
    target: 0.1,
  } as MetricDescriptor,
};

const dateFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
});

interface WebVitalOverviewChartProps {
  name: WebVitalsMetric;
  value: number;
  histogram: {
    key: number;
    value: number;
  }[];
}

function WebVitalOverviewChart({
  name,
  histogram,
}: WebVitalOverviewChartProps) {
  const theme = useTheme();
  return (
    <ResponsiveContainer height={200}>
      <LineChart data={histogram}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.grey[700]} />
        <XAxis
          dataKey="key"
          domain={['auto', 'auto']}
          scale="time"
          type="number"
          tickFormatter={(unixTime) => dateFormat.format(unixTime)}
          stroke="#FFF"
        />
        <YAxis tickFormatter={METRICS[name].format} stroke="#FFF" />
        <Tooltip
          label={name}
          labelFormatter={(value) => dateFormat.format(value as number)}
          formatter={(value) =>
            `${METRICS[name].format(value as number)} ${
              METRICS[name].unit || ''
            }`
          }
          isAnimationActive={false}
        />
        <ReferenceLine
          y={METRICS[name].target}
          label={`target: ${METRICS[name].format(METRICS[name].target)} ${
            METRICS[name].unit || ''
          }`}
          stroke="red"
        />
        <Line
          name={name}
          dataKey="value"
          isAnimationActive={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface WebVitalSummaryProps {
  name: WebVitalsMetric;
  value: number;
  active?: boolean;
  onClick: () => void;
}

function WebVitalOverviewSummary({
  name,
  value,
  active,
  onClick,
}: WebVitalSummaryProps) {
  return (
    <Box
      onClick={onClick}
      display="flex"
      flexDirection="column"
      m={2}
      alignItems="center"
    >
      <div>{name}</div>
      <div>
        {METRICS[name].format(value)} {METRICS[name].unit || ''}
      </div>
    </Box>
  );
}

interface WebVitalsOverviewProps {
  charts: ChartData;
  percentile: Percentile;
}

function WebVitalsOverview({ charts, percentile }: WebVitalsOverviewProps) {
  const [activeMetric, setActiveMetric] = React.useState<WebVitalsMetric>(
    'FCP'
  );

  const histogram = charts.histogram.buckets.map((bucket) => ({
    key: bucket.key,
    value: bucket[`${activeMetric}_percentiles` as const].values[percentile],
  }));

  const summaryProps = (name: WebVitalsMetric) => ({
    name,
    active: activeMetric === name,
    onClick: () => setActiveMetric(name),
    value: charts[`${name}_percentiles` as const].values[percentile],
  });

  return (
    <Paper>
      <Box display="flex" flexDirection="row">
        <Box display="flex" flexDirection="column">
          <WebVitalOverviewSummary {...summaryProps('FCP')} />
          <Divider flexItem />
          <WebVitalOverviewSummary {...summaryProps('LCP')} />
          <Divider flexItem />
          <WebVitalOverviewSummary {...summaryProps('FID')} />
          <Divider flexItem />
          <WebVitalOverviewSummary {...summaryProps('TTFB')} />
          <Divider flexItem />
          <WebVitalOverviewSummary {...summaryProps('CLS')} />
        </Box>
        <Box p={2}>
          <Typography variant="h6">{METRICS[activeMetric].title}</Typography>
          <Typography>
            {METRICS[activeMetric].description}{' '}
            <Link href={METRICS[activeMetric].link}>More info</Link>
          </Typography>
          <WebVitalOverviewChart
            name={activeMetric}
            value={
              charts[`${activeMetric}_percentiles` as const].values[percentile]
            }
            histogram={histogram}
          />
        </Box>
      </Box>
    </Paper>
  );
}

interface PropertyProps {
  id: string;
}

export default function PropertyPageContent({ id }: PropertyProps) {
  const { data: property } = useSWR<Property>(`/api/data/${id}`);
  const { data } = useSWR<ChartData>(`/api/data/${id}/charts`);
  const [percentile, setPercentile] = React.useState<Percentile>('75.0');
  return (
    <>
      <Typography variant="h2">{property ? property.name : '-'}</Typography>
      <Toolbar disableGutters>
        <Select
          variant="outlined"
          value={percentile}
          onChange={(e) => setPercentile(e.target.value as Percentile)}
        >
          <MenuItem value="75.0">75th percentile</MenuItem>
          <MenuItem value="90.0">90th percentile</MenuItem>
          <MenuItem value="99.0">99th percentile</MenuItem>
        </Select>
      </Toolbar>
      {data && <WebVitalsOverview charts={data} percentile={percentile} />}
    </>
  );
}
