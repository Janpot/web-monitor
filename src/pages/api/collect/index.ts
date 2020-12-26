import { NextApiHandler } from 'next';
import { Client } from '@elastic/elasticsearch';
import { SerializedPageMetrics } from '../../../types';
import properties from '../../../lib/properties';

if (!process.env.ELASTICSEARCH_NODE) {
  throw new Error('Missing env variable "ELASTICSEARCH_NODE"');
}

const client = new Client({ node: process.env.ELASTICSEARCH_NODE });

async function initialize() {
  const policyName = 'metrics-policy';
  await client.ilm.putLifecycle({
    policy: policyName,
    body: {
      policy: {
        phases: {
          hot: {
            actions: {
              rollover: {
                max_size: '25GB',
              },
            },
          },
          delete: {
            min_age: '30d',
            actions: {
              delete: {},
            },
          },
        },
      },
    },
  });
  await client.indices.putIndexTemplate({
    name: 'metrics-template',
    body: {
      index_patterns: ['metrics-*'],
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
    return res.status(403).end();
  }

  const eventTimestamp = Date.now() + offset;

  const result = await client.index({
    index: `metrics-${property.id}`,
    body: {
      '@timestamp': new Date(eventTimestamp).toISOString(),
      property: property.id,
      ...event,
    },
  });

  console.log(result);

  if (result.body?.errors) {
    console.error(`There were errors indexing this event`);
  }

  res.setHeader('access-control-allow-origin', '*');
  res.send('OK');
}) as NextApiHandler;
