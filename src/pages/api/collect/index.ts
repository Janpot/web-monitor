import { NextApiHandler } from 'next';
import { SerializedPageMetrics } from '../../../types';
import { getProperty } from '../../../lib/database';
import { addMetric } from '../../../lib/metrics';
import DeviceDetector from 'device-detector-js';

const deviceDetector = new DeviceDetector();

export default (async (req, res) => {
  // TODO: parse properly
  const event = JSON.parse(req.body) as SerializedPageMetrics;

  const property = await getProperty(event.property);

  if (!property) {
    console.warn(`Unknown property "${event.property}"`);
    return res.status(403).end();
  }

  const url = new URL(event.url);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    console.warn(`Invalid url ${event.url}`);
    return res.status(403).end();
  }

  const detected = deviceDetector.parse(req.headers['user-agent'] || '');

  if (detected.bot) {
    console.warn(`Bot detected ${detected.bot.name}`);
    return res.status(403).end();
  }

  await addMetric({
    browser: detected.client?.name,
    device: detected.device?.type,
    protocol: url.protocol,
    host: url.host,
    pathname: url.pathname,
    ...event,
  });

  res.setHeader('access-control-allow-origin', '*');
  res.send('OK');
}) as NextApiHandler;
