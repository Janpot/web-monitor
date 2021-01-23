import dotenv from 'dotenv';
import * as path from 'path';
import { BigQuery } from '@google-cloud/bigquery';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const bigqueryClient = new BigQuery({
  projectId: 'web-monitor-299815',
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_CLIENT_PRIVATE_KEY,
  },
});

async function createPageviewsTable(datasetId = 'visitors') {
  await bigqueryClient.dataset(datasetId).createTable('pageviews', {
    location: 'US',
    schema: [
      { name: 'property', type: 'STRING', mode: 'REQUIRED' },
      {
        name: 'visitor',
        type: 'RECORD',
        fields: [
          { name: 'browser', type: 'STRING' },
          { name: 'device', type: 'STRING' },
          { name: 'connection', type: 'STRING' },
          { name: 'country', type: 'STRING' },
          { name: 'ip', type: 'STRING', mode: 'REQUIRED' },
        ],
      },
      {
        name: 'location',
        type: 'RECORD',
        fields: [
          { name: 'href', type: 'STRING', mode: 'REQUIRED' },
          { name: 'host', type: 'STRING', mode: 'REQUIRED' },
        ],
      },
      {
        name: 'referral',
        type: 'RECORD',
        fields: [
          { name: 'href', type: 'STRING' },
          { name: 'source', type: 'STRING' },
          { name: 'medium', type: 'STRING' },
          { name: 'term', type: 'STRING' },
          { name: 'campaign', type: 'STRING' },
          { name: 'content', type: 'STRING' },
        ],
      },
      {
        name: 'metrics',
        type: 'RECORD',
        fields: [
          { name: 'duration', type: 'FLOAT', mode: 'REQUIRED' },
          { name: 'visible', type: 'FLOAT', mode: 'REQUIRED' },
          { name: 'CLS', type: 'FLOAT' },
          { name: 'FCP', type: 'FLOAT' },
          { name: 'FID', type: 'FLOAT' },
          { name: 'LCP', type: 'FLOAT' },
          { name: 'TTFB', type: 'FLOAT' },
        ],
      },
    ],
  });
}

async function main() {
  // Run the query
  await createPageviewsTable();
}

main();
