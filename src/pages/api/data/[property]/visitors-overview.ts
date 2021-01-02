import { NextApiHandler } from 'next';
import {
  getVisitorsOverview,
  VisitorsOverviewData,
  WebVitalsPeriod,
} from '../../../../lib/metrics';
import { getValue } from '../../../../lib/querystring';

export default (async (req, res) => {
  const propertyId = getValue(req.query, 'property');
  if (!propertyId) {
    return res.status(400).end();
  }
  const chartData = await getVisitorsOverview(propertyId, {
    period: req.query.period as WebVitalsPeriod,
  });
  res.json(chartData);
}) as NextApiHandler<VisitorsOverviewData>;
