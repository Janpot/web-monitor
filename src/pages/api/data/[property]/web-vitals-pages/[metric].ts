import { NextApiHandler } from 'next';
import { getWebVitalsPages } from '../../../../../lib/metrics';
import { getValue } from '../../../../../lib/querystring';
import { WebVitalsDevice, WebVitalsMetric } from '../../../../../types';

interface NodeParsedQueryLike {
  [key: string]: string | string[] | undefined;
}

function getMetric(
  query: NodeParsedQueryLike,
  name: string
): WebVitalsMetric | undefined {
  const value = getValue(query, name);
  return value && ['FCP', 'LCP', 'FID', 'TTFB', 'CLS'].includes(value)
    ? (value as WebVitalsMetric)
    : undefined;
}

function getDevice(
  query: NodeParsedQueryLike,
  name: string
): WebVitalsDevice | undefined {
  const value = getValue(query, name);
  return value && ['mobile', 'desktop'].includes(value)
    ? (value as WebVitalsDevice)
    : undefined;
}

export default (async (req, res) => {
  const propertyId = getValue(req.query, 'property');
  const metric = getMetric(req.query, ' metric');
  if (!propertyId || !metric) {
    return res.status(400).end();
  }
  const chartData = await getWebVitalsPages(propertyId, metric, {
    device: getDevice(req.query, 'device'),
  });
  res.json(chartData);
}) as NextApiHandler;
