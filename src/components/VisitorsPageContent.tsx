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
  Typography,
  useTheme,
  Grid,
  makeStyles,
  createStyles,
  lighten,
  Container,
} from '@material-ui/core';
import { Property } from '../types';
import PropertyToolbar from './PropertyToolbar';
import Layout from './Layout';
import { PaperTab, PaperTabContent, PaperTabs } from './PaperTabs';

const useStyles = makeStyles((theme) =>
  createStyles({
    toolbarControl: {
      marginRight: theme.spacing(2),
    },
    active: {},
    visitorsMetricTab: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: theme.spacing(2),
    },
    metricValue: {
      fontSize: 24,
    },
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

type VisitorsMetric = 'pageviews' | 'sessions' | 'duration' | 'bounceRate';

interface WebVitalsOverviewProps {
  metric: VisitorsMetric;
  data?: VisitorsOverviewData;
}

function WebVitalsOverview({ data, metric }: WebVitalsOverviewProps) {
  const histogram = data
    ? data.histogram.map((bucket) => ({
        key: bucket.timestamp,
        value: bucket[metric],
      }))
    : [
        { key: Date.now() - 7 * 24 * 60 * 60 * 1000, value: null },
        { key: Date.now(), value: null },
      ];

  return <WebVitalOverviewChart name={metric} histogram={histogram} />;
}

interface VisitorsMetricTabProps {
  metric: VisitorsMetric;
  value: number | null;
  active: boolean;
  onClick: () => void;
}

function VisitorsMetricTab({
  metric,
  value,
  active,
  onClick,
}: VisitorsMetricTabProps) {
  const classes = useStyles();
  return (
    <PaperTab
      className={classes.visitorsMetricTab}
      onClick={onClick}
      active={active}
    >
      <div>{metric}</div>
      <div className={classes.metricValue}>
        {value === null ? '-' : METRICS[metric].format(value)}{' '}
        {METRICS[metric].unit || ''}
      </div>
    </PaperTab>
  );
}
interface PropertyProps {
  propertyId?: string;
}

export default function PropertyPageContent({ propertyId }: PropertyProps) {
  const { data: property } = useSWR<Property>(
    propertyId ? `/api/data/${propertyId}` : null
  );
  const { data: overviewData } = useSWR<VisitorsOverviewData>(
    propertyId ? `/api/data/${propertyId}/visitors-overview` : null
  );

  const [activeTab, setActiveTab] = React.useState<VisitorsMetric>('pageviews');
  const tabProps = (metric: VisitorsMetric): VisitorsMetricTabProps => ({
    metric,
    active: activeTab === metric,
    onClick: () => setActiveTab(metric),
    value: overviewData ? overviewData[metric] : null,
  });
  return (
    <Layout activeTab="visitors" property={property}>
      <Container>
        <PropertyToolbar property={property}></PropertyToolbar>
        <PaperTabs>
          <VisitorsMetricTab {...tabProps('pageviews')} />
          <VisitorsMetricTab {...tabProps('sessions')} />
          <VisitorsMetricTab {...tabProps('duration')} />
          <VisitorsMetricTab {...tabProps('bounceRate')} />
        </PaperTabs>
        <PaperTabContent>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Typography variant="h6">{METRICS[activeTab].title}</Typography>
              <Typography>{METRICS[activeTab].description}</Typography>
            </Grid>
            <Grid item xs={12}>
              <WebVitalsOverview data={overviewData} metric={activeTab} />
            </Grid>
          </Grid>
        </PaperTabContent>
      </Container>
    </Layout>
  );
}
