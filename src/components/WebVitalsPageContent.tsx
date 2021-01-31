import * as React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Dot,
} from 'recharts';
import {
  Box,
  MenuItem,
  Select,
  Typography,
  useTheme,
  Grid,
  makeStyles,
  createStyles,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Container,
  FormControl,
} from '@material-ui/core';
import {
  DeviceSelection,
  WebVitalsMetric,
  WebVitalsOverviewData,
  WebVitalsPagesData,
  WebVitalsPercentiles,
  WebVitalsPeriod,
} from '../types';
import Link from './Link';
import PropertyToolbar from './PropertyToolbar';
import Layout from './Layout';
import { PaperTabContent, PaperTabs } from './PaperTabs';
import MetricTab from './MetricTab';
import clsx from 'clsx';
import LineChart2 from './LineChart';
import {
  getWebVitalsOverview,
  getWebVitalsPages,
  getProperty,
} from '../pages/api/data';
import { useSwrFn } from '../lib/swr';
import DeviceSelector from './DeviceSelector';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const useStyles = makeStyles((theme) =>
  createStyles({
    bad: {},
    good: {},
    valueCell: {
      '&$bad': {
        color: theme.palette.error.main,
      },
      '&$good': {
        color: theme.palette.success.main,
      },
    },
  })
);

type Percentile = keyof WebVitalsPercentiles;

interface MetricDescriptor {
  title: string;
  description: string;
  link: string;
  format: (value: number) => string;
  unit?: 'ms' | 's';
  target: number;
}

const numberFormat = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
});
const numberFormatSeconds = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
});
const numberFormatMilliseconds = new Intl.NumberFormat('en', {
  maximumFractionDigits: 0,
});
const numberFormatCompact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

const METRICS = {
  FCP: {
    title: 'First Contentful Paint',
    description:
      "Measures the time from when the page starts loading to when any part of the page's content is rendered on the screen.",
    link: 'https://web.dev/fcp',
    format: (value) => numberFormatSeconds.format(value / 1000),
    unit: 's',
    target: 1000,
  } as MetricDescriptor,
  LCP: {
    title: 'Largest Contentful Paint ',
    description:
      'Measures loading performance. To provide a good user experience, LCP should occur within 2.5 seconds of when the page first starts loading.',
    link: 'https://web.dev/lcp',
    format: (value) => numberFormatSeconds.format(value / 1000),
    unit: 's',
    target: 2500,
  } as MetricDescriptor,
  FID: {
    title: 'First Input Delay',
    description:
      'Measures interactivity. To provide a good user experience, pages should have a FID of less than 100 milliseconds.',
    link: 'https://web.dev/fid',
    format: numberFormatMilliseconds.format,
    unit: 'ms',
    target: 100,
  } as MetricDescriptor,
  TTFB: {
    title: 'Time to First Byte',
    description:
      "The time that it takes for a user's browser to receive the first byte of page content.",
    link: 'https://web.dev/time-to-first-byte',
    format: numberFormatMilliseconds.format,
    unit: 'ms',
    target: 600,
  } as MetricDescriptor,
  CLS: {
    title: 'Cumulative Layout Shift',
    description:
      'Measures visual stability. To provide a good user experience, pages should maintain a CLS of less than 0.1.',
    link: 'https://web.dev/cls',
    format: numberFormat.format,
    target: 0.1,
  } as MetricDescriptor,
};

const dateFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
});

const timeFormat = new Intl.DateTimeFormat('en', {
  hour: 'numeric',
  minute: 'numeric',
});

interface WebVitalOverviewChartProps {
  name: WebVitalsMetric;
  histogram: {
    key: number;
    value: number | null;
  }[];
  period: WebVitalsPeriod;
}

function startOfDay(day: Date | number = Date.now()) {
  var start = new Date(day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function ceilToMagnitude(value: number): number {
  const multiplier = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / multiplier) * multiplier;
}

function tickFormatter(period: WebVitalsPeriod) {
  const formatter = period === 'day' ? timeFormat : dateFormat;
  return (unixTime: number) => formatter.format(unixTime);
}

function WebVitalOverviewChart({
  name,
  histogram,
  period,
}: WebVitalOverviewChartProps) {
  const theme = useTheme();
  const target = METRICS[name].target;
  const maxY = histogram.reduce(
    (max, bucket) => Math.max(max, bucket.value || target),
    target
  );
  return (
    <ResponsiveContainer height={200}>
      <LineChart data={histogram}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.grey[700]} />
        <XAxis
          dataKey="key"
          domain={['auto', 'auto']}
          scale="time"
          type="number"
          tickFormatter={tickFormatter(period)}
          // @ts-ignore will remove recharts soon
          stroke="#FFF"
        />
        <YAxis
          domain={[0, ceilToMagnitude(maxY)]}
          tickFormatter={METRICS[name].format}
          // @ts-ignore will remove recharts soon
          stroke="#FFF"
        />
        <Tooltip
          label={name}
          labelFormatter={(value) => tickFormatter(period)(value as number)}
          // @ts-ignore will remove recharts soon
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
          // @ts-ignore will remove recharts soon
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
          stroke="#61cdbb"
          fill={theme.palette.background.paper}
          dot={<Dot r={5} />}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface WebVitalsOverviewProps {
  data?: WebVitalsOverviewData;
  metric: WebVitalsMetric;
  percentile: keyof WebVitalsPercentiles;
  period: WebVitalsPeriod;
}

function WebVitalsOverview({
  data,
  percentile,
  metric,
  period,
}: WebVitalsOverviewProps) {
  const today = startOfDay().getTime();
  const histogram = data
    ? data.histogram.map((bucket) => ({
        key: bucket.timestamp,
        value: bucket[metric][percentile],
      }))
    : [
        { key: today - MS_PER_DAY, value: null },
        { key: today, value: null },
      ];

  return (
    <>
      {true ? (
        <WebVitalOverviewChart
          name={metric}
          histogram={histogram}
          period={period}
        />
      ) : (
        <LineChart2
          data={histogram.map((x) => ({ timestamp: x.key, value: x.value }))}
          width={900}
          height={300}
          target={METRICS[metric].target}
          label={metric}
          valueFormat={METRICS[metric].format}
          unit={METRICS[metric].unit}
          dateFormat={tickFormatter(period)}
        />
      )}
    </>
  );
}

interface WebVitalsPagesProps {
  data?: WebVitalsPagesData;
  metric: WebVitalsMetric;
  percentile: Percentile;
}

function columnHeader(name: WebVitalsMetric): string {
  return `${name} ${METRICS[name].unit ? `(${METRICS[name].unit})` : ''}`;
}

interface ValuecellProps {
  metric: WebVitalsMetric;
  percentile: Percentile;
  value: number | null;
}

function Valuecell({ metric, percentile, value }: ValuecellProps) {
  const classes = useStyles();
  return (
    <TableCell
      className={clsx(classes.valueCell, {
        [classes.bad]: value && value > METRICS[metric].target,
        [classes.good]: value && value <= METRICS[metric].target,
      })}
      align="right"
    >
      {value ? METRICS[metric].format(value) : '-'}
    </TableCell>
  );
}

function WebVitalsPages({ data, percentile, metric }: WebVitalsPagesProps) {
  return (
    <>
      <Typography variant="h6">By page</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Url</TableCell>
              <TableCell align="right">Samples</TableCell>
              <TableCell align="right">{columnHeader(metric)}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.pages.map((bucket) => (
              <TableRow key={bucket.page}>
                <TableCell component="th" scope="row">
                  {bucket.page}
                </TableCell>
                <TableCell align="right">
                  {numberFormatCompact.format(bucket.samples)}
                </TableCell>
                <Valuecell
                  metric={metric}
                  value={bucket.percentiles[percentile]}
                  percentile={percentile}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

interface WebVitalsTabProps {
  metric: WebVitalsMetric;
  value: number | null;
  active: boolean;
  onClick: () => void;
}

function WebVitalsTab({ metric, value, active, onClick }: WebVitalsTabProps) {
  return (
    <MetricTab
      title={METRICS[metric].title}
      onClick={onClick}
      active={active}
      severity={
        value === null
          ? null
          : value > METRICS[metric].target
          ? 'error'
          : 'success'
      }
      value={
        value === null
          ? '-'
          : `${METRICS[metric].format(value)} ${METRICS[metric].unit || ''}`
      }
    />
  );
}

interface WebVitalsTabsProps {
  data?: WebVitalsOverviewData;
  percentile: keyof WebVitalsPercentiles;
  value: WebVitalsMetric;
  onChange: (newValue: WebVitalsMetric) => void;
}

function WebVitalsTabs({
  data,
  percentile,
  value,
  onChange,
}: WebVitalsTabsProps) {
  const tabProps = (metric: WebVitalsMetric): WebVitalsTabProps => ({
    metric,
    active: value === metric,
    onClick: () => onChange(metric),
    value: data ? data.current[metric][percentile] : null,
  });

  return (
    <PaperTabs>
      <WebVitalsTab {...tabProps('FCP')} />
      <WebVitalsTab {...tabProps('LCP')} />
      <WebVitalsTab {...tabProps('FID')} />
      <WebVitalsTab {...tabProps('TTFB')} />
      <WebVitalsTab {...tabProps('CLS')} />
    </PaperTabs>
  );
}

interface PropertyProps {
  propertyId?: string;
}

export default function PropertyPageContent({ propertyId }: PropertyProps) {
  const [percentile, setPercentile] = React.useState<Percentile>('p75');
  const [device, setDevice] = React.useState<DeviceSelection>('all');
  const [period, setPeriod] = React.useState<WebVitalsPeriod>('day');
  const [activeTab, setActiveTab] = React.useState<WebVitalsMetric>('FCP');

  const { data: property } = useSwrFn(
    propertyId ? [propertyId] : null,
    getProperty
  );

  const { data: overviewData } = useSwrFn(
    propertyId ? [propertyId, device, period] : null,
    getWebVitalsOverview
  );

  const { data: pagesData } = useSwrFn(
    propertyId ? [propertyId, activeTab, device, period] : null,
    getWebVitalsPages
  );

  return (
    <Layout activePage="webVitals" property={property}>
      <Container>
        <PropertyToolbar property={property}>
          <FormControl variant="outlined" size="small">
            <Select
              value={percentile}
              onChange={(e) => setPercentile(e.target.value as Percentile)}
            >
              <MenuItem value="p75">75th percentile</MenuItem>
              <MenuItem value="p90">90th percentile</MenuItem>
              <MenuItem value="p99">99th percentile</MenuItem>
            </Select>
          </FormControl>
          <DeviceSelector value={device} onChange={setDevice} />
          <FormControl variant="outlined" size="small">
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value as WebVitalsPeriod)}
            >
              <MenuItem value="day">Last 24h</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
            </Select>
          </FormControl>
        </PropertyToolbar>
        <Box my={3}>
          <WebVitalsTabs
            data={overviewData}
            percentile={percentile}
            value={activeTab}
            onChange={setActiveTab}
          />
          <PaperTabContent>
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <Typography variant="h6">{METRICS[activeTab].title}</Typography>
                <Typography>
                  {METRICS[activeTab].description}{' '}
                  <Link href={METRICS[activeTab].link}>More info</Link>
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <WebVitalsOverview
                  data={overviewData}
                  metric={activeTab}
                  percentile={percentile}
                  period={period}
                />
              </Grid>
              <Grid item xs={12}>
                <WebVitalsPages
                  data={pagesData}
                  metric={activeTab}
                  percentile={percentile}
                />
              </Grid>
            </Grid>
          </PaperTabContent>
        </Box>
      </Container>
    </Layout>
  );
}
