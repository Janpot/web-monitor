import useSWR from 'swr';
import * as React from 'react';
import Link from './Link';
import { getProperties } from '../pages/api/data';

export default function Properties() {
  const { data: properties } = useSWR('anything', getProperties);
  return (
    <>
      {properties &&
        properties.map((property) => (
          <div key={property.id}>
            <Link href={`/property/${property.id}/audience`}>
              {property.name}
            </Link>
          </div>
        ))}
    </>
  );
}
