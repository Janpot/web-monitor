import * as React from 'react';
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
  Container,
  MenuItem,
  Select,
  Paper,
  Box,
} from '@material-ui/core';
import {
  WebVitalsPeriod,
  AudienceOverviewData,
  AudienceSourcesData,
  AudienceCountriesData,
} from '../types';
import PropertyToolbar from './PropertyToolbar';
import Layout from './Layout';
import { PaperTabContent, PaperTabs } from './PaperTabs';
import MetricTab from './MetricTab';
import {
  getProperty,
  getAudienceOverview,
  getAudienceSources,
  getAudienceCountries,
} from '../pages/api/data';
import { useSwrFn } from '../lib/swr';
import dynamic from 'next/dynamic';

const WorldMap = dynamic(() => import('./WorldMap'));

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface MetricDescriptor {
  title: string;
  description: string;
  link?: string;
  format: (value: number) => string;
  unit?: 'ms' | 's' | '%';
  target?: number;
}

const numberFormatCompact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 2,
});
const numberFormatPercent = new Intl.NumberFormat('en', {
  style: 'percent',
  maximumFractionDigits: 2,
});
const numberFormatPercentValue = new Intl.NumberFormat('en', {
  maximumFractionDigits: 1,
});
const numberFormatSeconds = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
});

const METRICS = {
  pageviews: {
    title: 'Pageviews',
    description: 'Measures how often a page was visited.',
    format: numberFormatCompact.format,
  } as MetricDescriptor,
  sessions: {
    title: 'Sessions',
    description: 'Measures amount of unique sessions.',
    format: numberFormatCompact.format,
  } as MetricDescriptor,
  duration: {
    title: 'Duration',
    description: 'Measures how a long a page is viewed by the user on average.',
    format: (value) => numberFormatSeconds.format(value / 1000),
    unit: 's',
  } as MetricDescriptor,
  bounceRate: {
    title: 'Bounce Rate',
    description:
      'Measures the ratio of sessions with only a single page view against all sessions.',
    format: (value) => numberFormatPercentValue.format(value * 100),
    unit: '%',
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
  name: VisitorsMetric;
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
  const maxY = histogram.reduce(
    (max, bucket) => Math.max(max, bucket.value || 0),
    0
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

interface AudienceOverviewProps {
  metric: VisitorsMetric;
  data?: AudienceOverviewData;
  period: WebVitalsPeriod;
}

function AudienceOverview({ data, metric, period }: AudienceOverviewProps) {
  const today = startOfDay().getTime();
  const histogram = data
    ? data.histogram.map((bucket) => ({
        key: bucket.timestamp,
        value: bucket[metric],
      }))
    : [
        { key: today - MS_PER_DAY, value: null },
        { key: today, value: null },
      ];

  return (
    <WebVitalOverviewChart
      name={metric}
      histogram={histogram}
      period={period}
    />
  );
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
  return (
    <MetricTab
      title={METRICS[metric].title}
      onClick={onClick}
      active={active}
      value={
        value === null
          ? '-'
          : `${METRICS[metric].format(value)} ${METRICS[metric].unit || ''}`
      }
    />
  );
}

interface AudienceSourcesProps {
  data?: AudienceSourcesData;
  period: WebVitalsPeriod;
}

function AudienceSources({ data }: AudienceSourcesProps) {
  return (
    <div>
      {data?.sources?.map((bucket) => (
        <div key={bucket.source}>
          {bucket.source} {numberFormatPercent.format(bucket.percent)}
        </div>
      ))}
    </div>
  );
}

interface AudienceCountriesProps {
  data?: AudienceCountriesData;
  period: WebVitalsPeriod;
}

function AudienceCountries({ data }: AudienceCountriesProps) {
  const values = Object.fromEntries(
    data?.countries?.map((country) => [country.numeric, country.percent]) || []
  );
  return (
    <div style={{ height: 400 }}>
      <WorldMap values={values} />
    </div>
  );
}

interface PropertyProps {
  propertyId?: string;
}

export default function PropertyPageContent({ propertyId }: PropertyProps) {
  const [period, setPeriod] = React.useState<WebVitalsPeriod>('day');

  const { data: property } = useSwrFn(
    propertyId ? [propertyId] : null,
    getProperty
  );

  const { data: overviewData } = useSwrFn(
    propertyId ? [propertyId, period] : null,
    getAudienceOverview
  );

  const { data: sourcesData } = useSwrFn(
    propertyId ? [propertyId, period] : null,
    getAudienceSources
  );

  const { data: countriesData } = useSwrFn(
    propertyId ? [propertyId, period] : null,
    getAudienceCountries
  );

  const [activeTab, setActiveTab] = React.useState<VisitorsMetric>('pageviews');
  const tabProps = (metric: VisitorsMetric): VisitorsMetricTabProps => ({
    metric,
    active: activeTab === metric,
    onClick: () => setActiveTab(metric),
    value: overviewData ? overviewData[metric] : null,
  });

  return (
    <Layout activeTab="audience" property={property}>
      <Container>
        <PropertyToolbar property={property}>
          <Select
            variant="outlined"
            value={period}
            onChange={(e) => setPeriod(e.target.value as WebVitalsPeriod)}
          >
            <MenuItem value="day">Last 24h</MenuItem>
            <MenuItem value="month">Last Month</MenuItem>
          </Select>
        </PropertyToolbar>
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <PaperTabs>
              <VisitorsMetricTab {...tabProps('pageviews')} />
              <VisitorsMetricTab {...tabProps('sessions')} />
              <VisitorsMetricTab {...tabProps('duration')} />
              <VisitorsMetricTab {...tabProps('bounceRate')} />
            </PaperTabs>
            <PaperTabContent>
              <Grid container spacing={4}>
                <Box p={2}>
                  <Typography variant="h6">
                    {METRICS[activeTab].title}
                  </Typography>
                  <Typography>{METRICS[activeTab].description}</Typography>
                </Box>
                <AudienceOverview
                  data={overviewData}
                  metric={activeTab}
                  period={period}
                />
              </Grid>
            </PaperTabContent>
          </Grid>
          <Grid item xs={12}>
            <Paper>
              <Box p={2}>
                <Typography variant="h6">By Country</Typography>
                <AudienceCountries data={countriesData} period={period} />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <Paper>
              <Box p={2}>
                <Typography variant="h6">Referral Sources</Typography>
                <AudienceSources data={sourcesData} period={period} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}