import { getSession } from 'next-auth/client';
import { getContext } from 'next-rpc/context';
import { WebVitalsPeriod, WebVitalsDevice, WebVitalsMetric } from '../../types';
import * as metrics from '../../lib/metrics';
import * as usersData from '../../lib/users';

export const config = { rpc: true };

export async function getWebVitalsOverview(
  property: string,
  device: WebVitalsDevice,
  period: WebVitalsPeriod
) {
  const { req } = getContext();
  const session = await getSession({ req });
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return metrics.getWebVitalsOverview(metrics.getClient(), {
    property,
    device,
    period,
  });
}

export async function getWebVitalsPages(
  property: string,
  metric: WebVitalsMetric,
  device: WebVitalsDevice,
  period: WebVitalsPeriod
) {
  const { req } = getContext();
  const session = await getSession({ req });
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return metrics.getWebVitalsPages(metrics.getClient(), {
    property,
    metric,
    device,
    period,
  });
}

export async function getAudienceOverview(
  property: string,
  period: WebVitalsPeriod
) {
  const { req } = getContext();
  const session = await getSession({ req });
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return metrics.getAudienceOverview(metrics.getClient(), {
    property,
    period,
  });
}

export async function getProperties() {
  const { req } = getContext();
  const session = await getSession({ req });
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return usersData.getProperties();
}

export async function getProperty(propertyId: string) {
  const { req } = getContext();
  const session = await getSession({ req });
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return usersData.getProperty(propertyId);
}
