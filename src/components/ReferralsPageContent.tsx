import * as React from 'react';
import {
  Typography,
  Grid,
  Container,
  MenuItem,
  Select,
  Paper,
  Box,
} from '@material-ui/core';
import { WebVitalsPeriod, ReferralsSourcesData } from '../types';
import PropertyToolbar from './PropertyToolbar';
import Layout from './Layout';
import { getProperty, getReferralsSources } from '../pages/api/data';
import { useSwrFn } from '../lib/swr';
import RankedBars from './RankedBars';

const numberFormatCompact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

interface AudienceSourcesProps {
  data?: ReferralsSourcesData;
  period: WebVitalsPeriod;
}

function AudienceSources({ data }: AudienceSourcesProps) {
  return (
    <div>
      <RankedBars
        data={
          data?.sources
            ?.map((bucket) => ({ label: bucket.source, value: bucket.count }))
            .reverse() || []
        }
        formatValue={numberFormatCompact.format}
      />
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

  const { data: sourcesData } = useSwrFn(
    propertyId ? [propertyId, period] : null,
    getReferralsSources
  );

  return (
    <Layout activeTab="referrals" property={property}>
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
          <Grid item xs={12} md={6} lg={4}>
            <Paper>
              <Box p={2}>
                <Typography variant="h6">By Source</Typography>
                <AudienceSources data={sourcesData} period={period} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}
