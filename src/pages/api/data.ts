import { getSession } from 'next-auth/client';
import { getContext } from 'next-rpc/context';
import {
  WebVitalsPeriod,
  DeviceSelection,
  WebVitalsMetric,
  AudiencePagesOrder,
} from '../../types';
import * as metrics from '../../lib/metrics';
import * as usersData from '../../lib/users';

export const config = { rpc: true };

export async function getWebVitalsOverview(
  property: string,
  device: DeviceSelection,
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
  device: DeviceSelection,
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

export async function getAudiencePages(
  property: string,
  device: DeviceSelection,
  period: WebVitalsPeriod,
  order: AudiencePagesOrder
) {
  const { req } = getContext();
  const session = await getSession({ req });
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return metrics.getAudiencePages(metrics.getClient(), {
    property,
    device,
    period,
    order,
  });
}

export async function getAudienceOverview(
  property: string,
  period: WebVitalsPeriod,
  device: DeviceSelection
) {
  const { req } = getContext();
  const session = await getSession({ req });
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return metrics.getAudienceOverview(metrics.getClient(), {
    property,
    period,
    device,
  });
}

export async function getReferralsSources(
  property: string,
  period: WebVitalsPeriod
) {
  const { req } = getContext();
  const session = await getSession({ req });
  if (!session) {
    throw new Error('Unauthenticated');
  }

  return metrics.getReferralsSources(metrics.getClient(), {
    property,
    period,
  });
}

export async function getAudienceCountries(
  property: string,
  period: WebVitalsPeriod,
  device: DeviceSelection
) {
  const { req } = getContext();
  const session = await getSession({ req });
  if (!session) {
    throw new Error('Unauthenticated');
  }

  return metrics.getAudienceCountries(metrics.getClient(), {
    property,
    period,
    device,
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
