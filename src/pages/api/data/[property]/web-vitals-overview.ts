import { NextApiHandler } from 'next';
import {
  getWebVitalsOverviewData,
  WebVitalsOverviewData,
  WebVitalsPeriod,
} from '../../../../lib/metrics';
import { getValue } from '../../../../lib/querystring';
import { WebVitalsDevice } from '../../../../types';

export default (async (req, res) => {
  const propertyId = getValue(req.query, 'property');
  if (!propertyId) {
    return res.status(400).end();
  }
  return res.json(
    await getWebVitalsOverviewData(propertyId, {
      device: req.query.device as WebVitalsDevice,
      period: req.query.period as WebVitalsPeriod,
    })
  );
}) as NextApiHandler<WebVitalsOverviewData>;
