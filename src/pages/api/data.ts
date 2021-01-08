import { getSession } from 'next-auth/client';
import { getContext } from 'next-rpc/context';
import { WebVitalsPeriod, WebVitalsDevice, WebVitalsMetric } from '../../types';
import * as metricsData from '../../lib/metrics';
import * as usersData from '../../lib/users';

export const config = { rpc: true };

export async function getWebVitalsOverview(
  propertyId: string,
  device: WebVitalsDevice,
  period: WebVitalsPeriod
) {
  const { req } = getContext();
  const session = await getSession({ req });
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return metricsData.getWebVitalsOverview(propertyId, {
    device,
    period,
  });
}

export async function getWebVitalsPages(
  propertyId: string,
  metric: WebVitalsMetric,
  device: WebVitalsDevice,
  period: WebVitalsPeriod
) {
  const { req } = getContext();
  const session = await getSession({ req });
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return metricsData.getWebVitalsPages(propertyId, metric, {
    device,
    period,
  });
}

export async function getVisitorsOverview(
  propertyId: string,
  period: WebVitalsPeriod
) {
  const { req } = getContext();
  const session = await getSession({ req });
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return metricsData.getVisitorsOverview(propertyId, {
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
