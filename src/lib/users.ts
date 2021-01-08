import { Property } from '../types';

if (typeof window !== 'undefined') {
  throw new Error('Server-only module');
}

const PROPERTIES: Property[] = [
  {
    id: '12345',
    name: 'test',
    ignoredQueryParams: [],
  },
  {
    id: '23456',
    name: 'woorank.com',
    ignoredQueryParams: ['ez_cid', 'gclid'],
  },
];

export async function getProperties() {
  return PROPERTIES;
}

export async function getProperty(
  propertyId: string
): Promise<Property | null> {
  return PROPERTIES.find(({ id }) => id === propertyId) || null;
}
