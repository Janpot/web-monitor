import * as React from 'react';
import PropertyPageContent from '../../../components/PropertyPageContent';
import { useRouter } from 'next/dist/client/router';

export default function Page() {
  const { query } = useRouter();

  console.log(query.propertyId);

  return <PropertyPageContent propertyId={query.propertyId as string} />;
}
