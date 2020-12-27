import * as React from 'react';
import { signIn, signOut, useSession } from 'next-auth/client';
import Properties from '../components/Properties';
import Layout from '../components/Layout';

export default function Page() {
  const [session, loading] = useSession();

  return (
    <Layout>
      <Properties />
    </Layout>
  );
}
