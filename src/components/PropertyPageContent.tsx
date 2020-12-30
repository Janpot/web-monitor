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
  FormControlLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Toolbar,
  Typography,
  useTheme,
  Grid,
  makeStyles,
  createStyles,
} from '@material-ui/core';
import { Property, WebVitalsDevice, WebVitalsMetric } from '../types';
import Link from './Link';
import { Skeleton } from '@material-ui/lab';
import clsx from 'clsx';

const useStyles = makeStyles((theme) =>
  createStyles({
    toolbarControl: {
      marginRight: theme.spacing(2),
    },
    active: {},
    webVitalSummary: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: 100,
      padding: theme.spacing(2),
      cursor: 'pointer',
      background: theme.palette.grey[900],
      '&$active': {
        background: theme.palette.background.paper,
      },
      '&:hover': {
        opacity: 0.7,
      },
    },
  })
);

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
  histogram: {
    key: number;
    value: number | null;
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
          contentStyle={{
            background: theme.palette.background.paper,
            borderRadius: theme.shape.borderRadius,
          }}
        />
        <ReferenceLine
          y={METRICS[name].target}
          label={`target: ${METRICS[name].format(METRICS[name].target)} ${
            METRICS[name].unit || ''
          }`}
          stroke="red"
          strokeDasharray="3 3"
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
  value: number | null;
  active?: boolean;
  onClick: () => void;
}

function WebVitalOverviewSummary({
  name,
  value,
  active,
  onClick,
}: WebVitalSummaryProps) {
  const classes = useStyles();
  return (
    <div
      className={clsx(classes.webVitalSummary, { [classes.active]: active })}
      onClick={onClick}
    >
      <div>{name}</div>
      <div>
        {value === null ? '-' : METRICS[name].format(value)}{' '}
        {METRICS[name].unit || ''}
      </div>
    </div>
  );
}

interface WebVitalsOverviewProps {
  charts?: ChartData;
  percentile: Percentile;
}

function WebVitalsOverview({ charts, percentile }: WebVitalsOverviewProps) {
  const [activeMetric, setActiveMetric] = React.useState<WebVitalsMetric>(
    'FCP'
  );

  const histogram = charts
    ? charts.histogram.buckets.map((bucket) => ({
        key: bucket.key,
        value:
          bucket[`${activeMetric}_percentiles` as const].values[percentile],
      }))
    : [
        { key: Date.now() - 7 * 24 * 60 * 60 * 1000, value: null },
        { key: Date.now(), value: null },
      ];

  const summaryProps = (name: WebVitalsMetric) => ({
    name,
    active: activeMetric === name,
    onClick: () => setActiveMetric(name),
    value: charts
      ? charts[`${name}_percentiles` as const].values[percentile]
      : null,
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
        <Box p={3} flex={1} width={0}>
          <Typography variant="h6">{METRICS[activeMetric].title}</Typography>
          <Typography>
            {METRICS[activeMetric].description}{' '}
            <Link href={METRICS[activeMetric].link}>More info</Link>
          </Typography>
          <Box mt={5} width="100%">
            <WebVitalOverviewChart name={activeMetric} histogram={histogram} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

interface PropertyProps {
  id: string;
}

export default function PropertyPageContent({ id }: PropertyProps) {
  const classes = useStyles();
  const [percentile, setPercentile] = React.useState<Percentile>('75.0');
  const [device, setDevice] = React.useState<WebVitalsDevice>('mobile');
  const { data: property } = useSWR<Property>(`/api/data/${id}`);
  const { data } = useSWR<ChartData>(
    `/api/data/${id}/charts?device=${encodeURIComponent(device)}`
  );
  return (
    <>
      <Typography variant="h2">
        {property ? property.name : <Skeleton width={260} />}
      </Typography>
      <Box my={3}>
        <Toolbar disableGutters>
          <Select
            className={classes.toolbarControl}
            variant="outlined"
            value={percentile}
            onChange={(e) => setPercentile(e.target.value as Percentile)}
          >
            <MenuItem value="75.0">75th percentile</MenuItem>
            <MenuItem value="90.0">90th percentile</MenuItem>
            <MenuItem value="99.0">99th percentile</MenuItem>
          </Select>
          <RadioGroup
            className={classes.toolbarControl}
            row
            value={device}
            onChange={(e) => setDevice(e.target.value as WebVitalsDevice)}
          >
            <FormControlLabel
              value="mobile"
              control={<Radio />}
              label="Mobile"
            />
            <FormControlLabel
              value="desktop"
              control={<Radio />}
              label="Desktop"
            />
          </RadioGroup>
        </Toolbar>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <WebVitalsOverview charts={data} percentile={percentile} />
        </Grid>
      </Grid>
    </>
  );
}
