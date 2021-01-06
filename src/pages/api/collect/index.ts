import { NextApiHandler, NextApiRequest } from 'next';
import { Property, SerializedPageMetrics } from '../../../types';
import { getProperty } from '../../../lib/database';
import { addMetric, getSession, Referral } from '../../../lib/metrics';
import DeviceDetector from 'device-detector-js';
import { getValue } from '../../../lib/querystring';
import * as uuid from 'uuid';
import { lookup as lookupCountryByIp } from 'geoip-country';
import { parse as parseRefererHeader } from '../../../lib/referer';

const deviceDetector = new DeviceDetector();

function cleanUrl(property: Property, urlIn: URL): URL {
  const url = new URL(urlIn.href);
  for (const param of property.ignoredQueryParams) {
    url.searchParams.delete(param);
  }
  url.searchParams.sort();
  return url;
}

function getIpAddress(req: NextApiRequest): string | undefined {
  return getValue(req.headers, 'x-forwarded-for') || req.socket.remoteAddress;
}

const UTM_PARAMS = ['source', 'medium', 'term', 'campaign', 'content'] as const;
type UtmParam = typeof UTM_PARAMS[number];

type Utm = {
  [key in UtmParam]?: string;
};

function extractUtm(url: URL): Utm | undefined {
  const entries = UTM_PARAMS.map((param) => [
    param,
    url.searchParams.get(`utm_${param}`),
  ]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function extractReferral(url: URL, referer?: URL): Referral | undefined {
  return extractUtm(url) || (referer && parseRefererHeader(referer));
}

export default (async (req, res) => {
  // TODO: parse properly
  const { url: rawUrl, offset, ...event } = JSON.parse(
    req.body
  ) as SerializedPageMetrics;

  const property = await getProperty(event.property);

  if (!property) {
    console.warn(`Unknown property "${event.property}"`);
    return res.status(403).end();
  }

  const url = new URL(rawUrl);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    console.warn(`Invalid url ${rawUrl}`);
    return res.status(403).end();
  }

  const { href } = cleanUrl(property, url);

  const detected = deviceDetector.parse(req.headers['user-agent'] || '');

  if (detected.bot) {
    console.warn(`Bot detected ${detected.bot.name}`);
    return res.status(403).end();
  }

  const timestamp = Date.now() + offset;

  const ip = getIpAddress(req);
  const country = ip ? lookupCountryByIp(ip) : null;

  const existingSession = ip && (await getSession(property.id, ip, timestamp));
  const session: string = existingSession || uuid.v1();

  const referer =
    (typeof event.referrer === 'string' && new URL(event.referrer)) ||
    undefined;

  console.log({
    browser: detected.client?.name,
    device: detected.device?.type,
    timestamp,
    country: country ? country.country : undefined,
    session,
    referral: extractReferral(url, referer),
    isNewSession: !existingSession,
    location: {
      href,
      host: url.host,
    },
    ...event,
  });

  await addMetric({
    browser: detected.client?.name,
    device: detected.device?.type,
    timestamp,
    country: country ? country.country : undefined,
    session,
    referral: extractReferral(url, referer),
    isNewSession: !existingSession,
    location: {
      href,
      host: url.host,
    },
    ...event,
  });

  res.setHeader('access-control-allow-origin', '*');
  res.send('OK');
}) as NextApiHandler;
