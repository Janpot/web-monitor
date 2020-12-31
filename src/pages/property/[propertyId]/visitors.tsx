import * as React from 'react';
import VisitorsPageContent from '../../../components/VisitorsPageContent';
import Layout from '../../../components/Layout';
import { useRouter } from 'next/dist/client/router';
import { Container } from '@material-ui/core';

export default function Page() {
  const { query } = useRouter();

  return (
    <Layout>
      <Container>
        <>
          {query.propertyId && (
            <VisitorsPageContent id={query.propertyId as string} />
          )}
        </>
      </Container>
    </Layout>
  );
}
