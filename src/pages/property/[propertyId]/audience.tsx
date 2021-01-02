import * as React from 'react';
import VisitorsPageContent from '../../../components/VisitorsPageContent';
import { useRouter } from 'next/dist/client/router';
import { getValue } from '../../../lib/querystring';

export default function Page() {
  const { query } = useRouter();
  const propertyId = getValue(query, 'propertyId');
  return propertyId ? <VisitorsPageContent propertyId={propertyId} /> : null;
}
