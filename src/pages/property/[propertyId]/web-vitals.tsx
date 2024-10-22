import * as React from 'react';
import WebVitalsPageContent from '../../../components/WebVitalsPageContent';
import { useRouter } from 'next/dist/client/router';
import { getValue } from '../../../lib/querystring';

export default function Page() {
  const { query } = useRouter();
  const propertyId = getValue(query, 'propertyId');
  return propertyId ? <WebVitalsPageContent propertyId={propertyId} /> : null;
}
