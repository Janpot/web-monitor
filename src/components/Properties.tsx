import useSWR from 'swr';
import * as React from 'react';
import { Property } from '../types';
import Link from 'next/link';

export default function Properties() {
  const { data: properties } = useSWR<Property[]>('/api/properties');
  return (
    <>
      {properties &&
        properties.map((property) => (
          <div>
            <Link href={`/property/${property.id}`}>
              <a>{property.name}</a>
            </Link>
          </div>
        ))}
    </>
  );
}