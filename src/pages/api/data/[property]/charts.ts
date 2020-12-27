import { NextApiHandler } from 'next';
import { getCharts } from '../../../../lib/metrics';

export default (async (req, res) => {
  const chartData = await getCharts(req.query.property as string);
  res.json(chartData);
}) as NextApiHandler;
