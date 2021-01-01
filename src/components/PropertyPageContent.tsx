import useSWR from 'swr';
import * as React from 'react';
import { ChartData, WebVitalsPagesData } from '../lib/metrics';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@material-ui/core';
import { Property, WebVitalsDevice, WebVitalsMetric } from '../types';
import Link from './Link';
import clsx from 'clsx';
import PropertyShell from './PropertyShell';

const useStyles = makeStyles((theme) =>
  createStyles({
    toolbarControl: {
      marginRight: theme.spacing(2),
    },
    active: {},
    webVitalsSummaries: {
      background: theme.palette.grey[900],
    },
    webVitalTab: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: theme.spacing(2),
      borderBottom: '1px solid white',
      fontSize: 24,
      cursor: 'pointer',
      '&$active': {
        border: '1px solid white',
        borderBottom: 'none',
      },
    },
    webVitalTabs: {
      display: 'flex',
      flexDirection: 'row',
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

interface WebVitalsOverviewProps {
  data?: ChartData;
  metric: WebVitalsMetric;
  percentile: Percentile;
}

function WebVitalsOverview({
  data,
  percentile,
  metric,
}: WebVitalsOverviewProps) {
  const histogram = data
    ? data.histogram.buckets.map((bucket) => ({
        key: bucket.key,
        value: bucket[`${metric}_percentiles` as const].values[percentile],
      }))
    : [
        { key: Date.now() - 7 * 24 * 60 * 60 * 1000, value: null },
        { key: Date.now(), value: null },
      ];

  return (
    <Paper>
      <Box p={2}>
        <WebVitalOverviewChart name={metric} histogram={histogram} />
      </Box>
    </Paper>
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

function columnValue(
  name: WebVitalsMetric,
  percentile: Percentile,
  bucket: WebVitalsPagesData['pages']['buckets'][number]
): string {
  const value = bucket[`${name}_percentiles` as const].values[percentile];
  return value ? METRICS[name].format(value) : '-';
}

function WebVitalsPages({ data, percentile, metric }: WebVitalsPagesProps) {
  return (
    <Paper>
      <Box p={2}>
        <Typography variant="h6">By page</Typography>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Url</TableCell>
              <TableCell align="right">{columnHeader(metric)}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.pages.buckets.map((bucket) => (
              <TableRow key={bucket.key}>
                <TableCell component="th" scope="row">
                  {bucket.key}
                </TableCell>
                <TableCell align="right">
                  {columnValue(metric, percentile, bucket)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

interface WebVitalsTabProps {
  metric: WebVitalsMetric;
  value: number | null;
  active: boolean;
  onClick: () => void;
}

function WebVitalsTab({ metric, value, active, onClick }: WebVitalsTabProps) {
  const classes = useStyles();
  return (
    <div
      className={clsx(classes.webVitalTab, { [classes.active]: active })}
      onClick={onClick}
    >
      <div>{metric}</div>
      <div>
        {value === null ? '-' : METRICS[metric].format(value)}{' '}
        {METRICS[metric].unit || ''}
      </div>
    </div>
  );
}

interface WebVitalsTabsProps {
  data?: ChartData;
  percentile: Percentile;
  value: WebVitalsMetric;
  onChange: (newValue: WebVitalsMetric) => void;
}

function WebVitalsTabs({
  data,
  percentile,
  value,
  onChange,
}: WebVitalsTabsProps) {
  const classes = useStyles();
  const tabProps = (metric: WebVitalsMetric): WebVitalsTabProps => ({
    metric,
    active: value === metric,
    onClick: () => onChange(metric),
    value: data
      ? data[`${metric}_percentiles` as const].values[percentile]
      : null,
  });

  return (
    <div className={classes.webVitalTabs}>
      <WebVitalsTab {...tabProps('FCP')} />
      <WebVitalsTab {...tabProps('LCP')} />
      <WebVitalsTab {...tabProps('FID')} />
      <WebVitalsTab {...tabProps('TTFB')} />
      <WebVitalsTab {...tabProps('CLS')} />
    </div>
  );
}

interface PropertyProps {
  id: string;
}

export default function PropertyPageContent({ id }: PropertyProps) {
  const classes = useStyles();
  const [percentile, setPercentile] = React.useState<Percentile>('75.0');
  const [device, setDevice] = React.useState<WebVitalsDevice>('mobile');
  const [activeTab, setActiveTab] = React.useState<WebVitalsMetric>('FCP');
  const { data: property } = useSWR<Property>(`/api/data/${id}`);
  const { data: overviewData } = useSWR<ChartData>(
    `/api/data/${id}/web-vitals-overview?device=${encodeURIComponent(device)}`
  );
  const { data: pagesData } = useSWR<WebVitalsPagesData>(
    `/api/data/${id}/web-vitals-pages?device=${encodeURIComponent(device)}`
  );
  return (
    <PropertyShell property={property} active="webVitals">
      <Box my={3}>
        <Toolbar disableGutters>
          <Box flex={1} />
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
      <WebVitalsTabs
        data={overviewData}
        percentile={percentile}
        value={activeTab}
        onChange={setActiveTab}
      />
      <Box mt={5}>
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
      </Box>
    </PropertyShell>
  );
}
