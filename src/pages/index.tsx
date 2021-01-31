import * as React from 'react';
import Properties from '../components/Properties';
import Layout from '../components/Layout';
import { Container } from '@material-ui/core';

export default function Page() {
  return (
    <Layout>
      <Container maxWidth="sm">
        <Properties />
      </Container>
    </Layout>
  );
}
