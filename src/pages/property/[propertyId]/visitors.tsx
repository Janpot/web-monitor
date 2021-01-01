import * as React from 'react';
import VisitorsPageContent from '../../../components/VisitorsPageContent';
import { useRouter } from 'next/dist/client/router';

export default function Page() {
  const { query } = useRouter();

  return <VisitorsPageContent propertyId={query.propertyId as string} />;
}
