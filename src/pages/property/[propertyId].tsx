import * as React from 'react';
import { signIn, signOut, useSession } from 'next-auth/client';
import PropertyPageContent from '../../components/PropertyPageContent';
import Layout from '../../components/Layout';
import { useRouter } from 'next/dist/client/router';

export default function Page() {
  const [session, loading] = useSession();
  const { query } = useRouter();

  return (
    <Layout>
      {query.propertyId && (
        <PropertyPageContent id={query.propertyId as string} />
      )}
    </Layout>
  );
}
