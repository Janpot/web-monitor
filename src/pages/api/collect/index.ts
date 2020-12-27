import { NextApiHandler } from 'next';
import { SerializedPageMetrics } from '../../../types';
import { getProperty } from '../../../lib/database';
import { addMetric } from '../../../lib/metrics';

export default (async (req, res) => {
  // TODO: parse properly
  const event = JSON.parse(req.body) as SerializedPageMetrics;

  const property = await getProperty(event.property);

  if (!property) {
    console.warn(`Unknown property "${event.property}"`);
    return res.status(403).end();
  }

  await addMetric(event);

  res.setHeader('access-control-allow-origin', '*');
  res.send('OK');
}) as NextApiHandler;
