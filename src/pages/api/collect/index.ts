import { NextApiHandler, NextApiRequest } from 'next';
import { Property, SerializedPageMetrics } from '../../../types';
import { getProperty } from '../../../lib/users';
import { addMetric, getSession, Referral } from '../../../lib/metrics';
import DeviceDetector from 'device-detector-js';
import { getValue } from '../../../lib/querystring';
import * as uuid from 'uuid';
import { lookup as lookupCountryByIp } from 'geoip-country';
import { parse as parseRefererHeader } from '../../../lib/referer';

const UTM_PARAMS = ['source', 'medium', 'term', 'campaign', 'content'] as const;

const DEFAULT_IGNORED_PARAMS = ['cpc', 'fbclid'];

const deviceDetector = new DeviceDetector();

function cleanUrl(property: Property, urlIn: URL): URL {
  const url = new URL(urlIn.href);
  for (const param of property.ignoredQueryParams) {
    url.searchParams.delete(param);
  }
  for (const param of DEFAULT_IGNORED_PARAMS) {
    url.searchParams.delete(param);
  }
  for (const param of UTM_PARAMS) {
    url.searchParams.delete(`utm_${param}`);
  }
  url.searchParams.sort();
  return url;
}

function getIpAddress(req: NextApiRequest): string | undefined {
  return getValue(req.headers, 'x-forwarded-for') || req.socket.remoteAddress;
}

function extractUtm(url: URL): Referral | undefined {
  const entries: [typeof UTM_PARAMS[number], string][] = [];
  for (const param of UTM_PARAMS) {
    const value = url.searchParams.get(`utm_${param}`);
    if (value) {
      entries.push([param, value]);
    }
  }
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function extractReferral(url: URL, referer?: URL): Referral | undefined {
  const fromUtm = extractUtm(url);
  if (fromUtm) {
    return fromUtm;
  } else if (referer) {
    return (
      parseRefererHeader(referer) || { href: referer.href, medium: 'unknown' }
    );
  }
}

export default (async (req, res) => {
  // TODO: parse properly
  const { url: rawUrl, duration, referrer, ...event } = JSON.parse(
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

  const timestamp = Date.now() - duration;

  const ip = getIpAddress(req);
  const country = ip ? lookupCountryByIp(ip) : null;

  const existingSession = ip && (await getSession(property.id, ip, timestamp));
  const session: string = existingSession || uuid.v1();

  const referer =
    (typeof referrer === 'string' && new URL(referrer)) || undefined;

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
    duration,
    ...event,
  });

  res.setHeader('access-control-allow-origin', '*');
  res.send('OK');
}) as NextApiHandler;
