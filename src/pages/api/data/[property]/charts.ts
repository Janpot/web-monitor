import { NextApiHandler } from 'next';
import { getCharts } from '../../../../lib/metrics';
import { WebVitalsDevice } from '../../../../types';

export default (async (req, res) => {
  const chartData = await getCharts(req.query.property as string, {
    device: req.query.device as WebVitalsDevice,
  });
  res.json(chartData);
}) as NextApiHandler;
