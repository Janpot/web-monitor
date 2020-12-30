import { NextApiHandler } from 'next';
import { Property, SerializedPageMetrics } from '../../../types';
import { getProperty } from '../../../lib/database';
import { addMetric } from '../../../lib/metrics';
import DeviceDetector from 'device-detector-js';

const deviceDetector = new DeviceDetector();

function parseUrl(property: Property, input: string): URL {
  const url = new URL(input);
  for (const param of property.ignoredQueryParams) {
    url.searchParams.delete(param);
  }
  url.searchParams.sort();
  return url;
}

export default (async (req, res) => {
  // TODO: parse properly
  const { url, ...event } = JSON.parse(req.body) as SerializedPageMetrics;

  const property = await getProperty(event.property);

  if (!property) {
    console.warn(`Unknown property "${event.property}"`);
    return res.status(403).end();
  }

  const { protocol, href, host } = parseUrl(property, url);

  if (protocol !== 'http:' && protocol !== 'https:') {
    console.warn(`Invalid url ${url}`);
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
    location: {
      href,
      host,
    },
    ...event,
  });

  res.setHeader('access-control-allow-origin', '*');
  res.send('OK');
}) as NextApiHandler;
