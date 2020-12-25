import { NextApiHandler } from 'next';
import { Client } from '@elastic/elasticsearch';
import { SerializedData } from '../../../types';

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
          properties: {
            name: { type: 'keyword' },
            value: { type: 'double' },
            url: { type: 'text' },
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

  const property = req.query.property;

  const event = JSON.parse(req.body) as SerializedData;

  const eventTimestamp = Date.now() - event.duration;

  const result = await client.bulk({
    index: `metrics-${property}`,
    body: event.metrics.flatMap((metric) => [
      { create: {} },
      {
        '@timestamp': new Date(eventTimestamp).toISOString(),
        name: metric.name,
        url: event.url,
        value: metric.value,
      },
    ]),
  });

  if (result.body?.errors) {
    console.error(`There were errors indexing this event`);
  }

  res.setHeader('access-control-allow-origin', '*');
  res.send('OK');
}) as NextApiHandler;
