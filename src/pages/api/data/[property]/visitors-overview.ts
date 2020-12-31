import { NextApiHandler } from 'next';
import { getVisitorsOverview } from '../../../../lib/metrics';

export default (async (req, res) => {
  const chartData = await getVisitorsOverview(req.query.property as string);
  res.json(chartData);
}) as NextApiHandler;
