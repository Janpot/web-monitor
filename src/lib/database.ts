import { Property } from '../types';

if (typeof window !== 'undefined') {
  throw new Error('Server-only module');
}

const PROPERTIES: Property[] = [
  {
    id: '12345',
    name: 'test',
  },
  {
    id: '23456',
    name: 'woorank.com',
  },
];

export async function getUserProperties() {
  return PROPERTIES;
}

export async function getProperty(
  propertyId: string
): Promise<Property | null> {
  return PROPERTIES.find(({ id }) => id === propertyId) || null;
}
