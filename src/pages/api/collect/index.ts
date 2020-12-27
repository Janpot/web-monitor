import { NextApiHandler } from 'next';
import { Client } from '@elastic/elasticsearch';
import { SerializedPageMetrics } from '../../../types';
import properties from '../../../lib/properties';

if (!process.env.ELASTICSEARCH_NODE) {
  throw new Error('Missing env variable "ELASTICSEARCH_NODE"');
} else if (!process.env.INDEX_PREFIX) {
  throw new Error('Missing env variable "INDEX_PREFIX"');
} else if (!process.env.ELASTICSEARCH_USERNAME) {
  throw new Error('Missing env variable "ELASTICSEARCH_USERNAME"');
} else if (!process.env.ELASTICSEARCH_PASSWORD) {
  throw new Error('Missing env variable "ELASTICSEARCH_PASSWORD"');
}

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE,
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },
});

async function initialize() {
  const policyName = `${process.env.INDEX_PREFIX}-pagemetrics-policy`;
  await client.ilm.putLifecycle({
    policy: policyName,
    body: {
      policy: {
        phases: {
          hot: {
            actions: {
              rollover: {
                max_size: '25GB',
                max_age: '1d',
              },
            },
          },
          delete: {
            min_age: '7d',
            actions: {
              delete: {},
            },
          },
        },
      },
    },
  });
  await client.indices.putIndexTemplate({
    name: `${process.env.INDEX_PREFIX}-pagemetrics-template`,
    body: {
      index_patterns: [`${process.env.INDEX_PREFIX}-pagemetrics-*`],
      data_stream: {},
      priority: 200,
      template: {
        settings: {
          'index.lifecycle.name': policyName,
        },
        mappings: {
          dynamic: 'strict',
          properties: {
            property: { type: 'keyword' },
            url: { type: 'text' },
            CLS: { type: 'double' },
            FCP: { type: 'double' },
            FID: { type: 'double' },
            LCP: { type: 'double' },
            TTFB: { type: 'double' },
          },
        },
      },
    },
  });
}

let initPromise: Promise<void> | null = null;
async function ensureInitialized() {
  if (!initPromise) {
    initPromise = initialize();
  }
  await initPromise;
}

export default (async (req, res) => {
  await ensureInitialized();

  // TODO: parse properly
  const { offset, property: propertyId, ...event } = JSON.parse(
    req.body
  ) as SerializedPageMetrics;

  const property = properties.find(({ id }) => id === propertyId);

  if (!property) {
    console.warn(`Unknown property "${propertyId}"`);
    return res.status(403).end();
  }

  const eventTimestamp = Date.now() + offset;
  await client.index({
    index: `${process.env.INDEX_PREFIX}-pagemetrics`,
    body: {
      '@timestamp': new Date(eventTimestamp).toISOString(),
      property: property.id,
      ...event,
    },
  });

  res.setHeader('access-control-allow-origin', '*');
  res.send('OK');
}) as NextApiHandler;
