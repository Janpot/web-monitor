import * as React from 'react';
import PropertyPageContent from '../../../components/PropertyPageContent';
import { useRouter } from 'next/dist/client/router';
import { getValue } from '../../../lib/querystring';

export default function Page() {
  const { query } = useRouter();
  const propertyId = getValue(query, 'propertyId');
  return propertyId ? <PropertyPageContent propertyId={propertyId} /> : null;
}
