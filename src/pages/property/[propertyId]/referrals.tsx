import * as React from 'react';
import ReferralsPageContent from '../../../components/ReferralsPageContent';
import { useRouter } from 'next/dist/client/router';
import { getValue } from '../../../lib/querystring';

export default function ReferralsPage() {
  const { query } = useRouter();
  const propertyId = getValue(query, 'propertyId');
  return propertyId ? <ReferralsPageContent propertyId={propertyId} /> : null;
}
