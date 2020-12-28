import useSWR from 'swr';
import * as React from 'react';
import { Property } from '../types';
import Link from './Link';

export default function Properties() {
  const { data: properties } = useSWR<Property[]>('/api/properties');
  return (
    <>
      {properties &&
        properties.map((property) => (
          <div key={property.id}>
            <Link href={`/property/${property.id}`}>
              <a>{property.name}</a>
            </Link>
          </div>
        ))}
    </>
  );
}
