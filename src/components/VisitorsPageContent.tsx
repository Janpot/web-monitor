import useSWR from 'swr';
import * as React from 'react';
import { VisitorsOverviewData } from '../lib/metrics';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  Box,
  Divider,
  Paper,
  Typography,
  useTheme,
  Grid,
  makeStyles,
  createStyles,
  lighten,
  Toolbar,
} from '@material-ui/core';
import { Property } from '../types';
import { Skeleton } from '@material-ui/lab';
import clsx from 'clsx';
import Link from './Link';

const useStyles = makeStyles((theme) =>
  createStyles({
    toolbarControl: {
      marginRight: theme.spacing(2),
    },
    active: {},
    webVitalsSummaries: {
      background: theme.palette.grey[900],
    },
    webVitalSummary: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: 100,
      padding: theme.spacing(2),
      cursor: 'pointer',
      '&$active, &$active:hover': {
        cursor: 'unset',
        background: theme.palette.background.paper,
      },
      '&:hover': {
        background: lighten(theme.palette.grey[900], 0.05),
      },
    },
  })
);

interface MetricDescriptor {
  title: string;
  description: string;
  link?: string;
  format: (value: number) => string;
  unit?: 'ms' | 's';
  target?: number;
}

const numberFormat = new Intl.NumberFormat('en');
const numberFormatSeconds = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
});

const METRICS = {
  pageviews: {
    title: 'Pageviews',
    description: 'measures how often a page was visited',
    format: numberFormat.format,
  } as MetricDescriptor,
  sessions: {
    title: 'Sessions',
    description: 'Measures amount of unique sessions',
    format: numberFormat.format,
  } as MetricDescriptor,
  duration: {
    title: 'Duration',
    description: 'Measures how a long a page is viewed by the user on average',
    format: (value) => numberFormatSeconds.format(value / 1000),
    unit: 's',
  } as MetricDescriptor,
  bounceRate: {
    title: 'Bounce rate',
    description: 'measures the ratio of sessions with only a single page view',
    format: numberFormat.format,
  } as MetricDescriptor,
};

const dateFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
});

interface WebVitalOverviewChartProps {
  name: VisitorsMetric;
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
  name: VisitorsMetric;
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

type VisitorsMetric = 'pageviews' | 'sessions' | 'duration' | 'bounceRate';

interface WebVitalsOverviewProps {
  data?: VisitorsOverviewData;
}

function WebVitalsOverview({ data }: WebVitalsOverviewProps) {
  const classes = useStyles();
  const [activeMetric, setActiveMetric] = React.useState<VisitorsMetric>(
    'pageviews'
  );

  const histogram = data
    ? data.histogram.map((bucket) => ({
        key: bucket.timestamp,
        value: bucket[activeMetric],
      }))
    : [
        { key: Date.now() - 7 * 24 * 60 * 60 * 1000, value: null },
        { key: Date.now(), value: null },
      ];

  const summaryProps = (name: VisitorsMetric) => ({
    name,
    active: activeMetric === name,
    onClick: () => setActiveMetric(name),
    value: data ? data[name] : null,
  });

  return (
    <Paper>
      <Box display="flex" flexDirection="row">
        <Box
          display="flex"
          flexDirection="column"
          className={classes.webVitalsSummaries}
        >
          <WebVitalOverviewSummary {...summaryProps('pageviews')} />
          <Divider flexItem />
          <WebVitalOverviewSummary {...summaryProps('sessions')} />
          <Divider flexItem />
          <WebVitalOverviewSummary {...summaryProps('duration')} />
          <Divider flexItem />
          <WebVitalOverviewSummary {...summaryProps('bounceRate')} />
        </Box>
        <Box p={3} flex={1} width={0}>
          <Typography variant="h6">{METRICS[activeMetric].title}</Typography>
          <Typography>{METRICS[activeMetric].description} </Typography>
          <Box mt={5}>
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
  const { data: property } = useSWR<Property>(`/api/data/${id}`);
  const { data: overviewData } = useSWR<VisitorsOverviewData>(
    `/api/data/${id}/visitors-overview`
  );
  return (
    <>
      <Typography variant="h2">
        {property ? property.name : <Skeleton width={260} />}
      </Typography>
      <Toolbar disableGutters>
        {property && (
          <>
            <Link href={`/property/${property.id}/visitors`}>visitors</Link>
            <span style={{ margin: '0 8px' }}>|</span>
            <Link href={`/property/${property.id}/web-vitals`}>web vitals</Link>
          </>
        )}
      </Toolbar>
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <WebVitalsOverview data={overviewData} />
        </Grid>
      </Grid>
    </>
  );
}
