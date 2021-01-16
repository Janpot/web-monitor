import dotenv from 'dotenv';
import * as path from 'path';
import { Client } from '@elastic/elasticsearch';
import * as readline from 'readline';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function transformExists(client: Client, id: string): Promise<boolean> {
  try {
    await client.transform.getTransform({
      transform_id: id,
    });
    return true;
  } catch (err) {
    if (err.meta.body.error.type === 'resource_not_found_exception') {
      return false;
    }
    throw err;
  }
}

async function initialize(
  rl: readline.ReadLine,
  client: Client,
  indexPrefix: string
) {
  const policyName = `${indexPrefix}-pagemetrics-policy`;
  console.log(`Creating lifecycle policy "${policyName}"...`);
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
            min_age: '30d',
            actions: {
              delete: {},
            },
          },
        },
      },
    },
  });

  const indexTemplateName = `${indexPrefix}-pagemetrics-template`;
  const indexPatterns = [
    `${indexPrefix}-pagemetrics`,
    `${indexPrefix}-pagemetrics-*`,
  ];
  console.log(`Creating index template "${indexTemplateName}"...`);
  await client.indices.putIndexTemplate({
    name: indexTemplateName,
    body: {
      index_patterns: indexPatterns,
      data_stream: {},
      priority: 200,
      template: {
        settings: {
          'index.lifecycle.name': policyName,
        },
        mappings: {
          dynamic: false,
          properties: {
            property: { type: 'keyword' },
            browser: { type: 'keyword' },
            device: { type: 'keyword' },
            connection: { type: 'keyword' },
            ip: { type: 'keyword' },
            country: { type: 'keyword' },
            session: { type: 'keyword' },
            isNewSession: { type: 'boolean' },
            referral: {
              properties: {
                href: { type: 'keyword' },
                source: { type: 'keyword' },
                medium: { type: 'keyword' },
                term: { type: 'keyword' },
                campaign: { type: 'keyword' },
                content: { type: 'keyword' },
              },
            },
            location: {
              properties: {
                href: { type: 'keyword' },
                host: { type: 'keyword' },
              },
            },
            visible: { type: 'double' },
            duration: { type: 'double' },
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

  const transformId = `${indexPrefix}-sessions-transform`;
  let performTransformCreate = false;

  if (await transformExists(client, transformId)) {
    if (
      await askConsent(
        rl,
        `Transform "${transformId}" already exists, remove and replace?`,
        false
      )
    ) {
      await client.transform.stopTransform({
        transform_id: transformId,
        force: true,
      });
      await client.transform.deleteTransform({ transform_id: transformId });
      performTransformCreate = true;
    }
  } else {
    performTransformCreate = true;
  }

  if (performTransformCreate) {
    console.log(`Creating sessions transform "${transformId}"...`);
    await client.transform.putTransform({
      transform_id: transformId,
      body: {
        source: {
          index: indexPatterns,
        },
        pivot: {
          group_by: {
            sessionId: {
              terms: {
                field: 'session',
              },
            },
          },
          aggregations: {
            pageviews: { value_count: { field: 'location.href' } },
            uniquePageviews: { cardinality: { field: 'location.href' } },
            visible: { sum: { field: 'visible' } },
            details: {
              scripted_metric: {
                init_script: 'state.docs = []',
                map_script: `
                  Map span = [
                    '@timestamp':doc['@timestamp'].value,
                    'page':doc['location.href'].value,
                    'duration':doc['visible'].size() == 0 ? 0 : doc['visible'].value
                  ];
                  state.docs.add(span)
                `,
                combine_script: 'return state.docs;',
                reduce_script: `
                  def all_docs = [];
                  for (s in states) {
                    for (span in s) {
                      all_docs.add(span);
                    }
                  }
                  all_docs.sort((HashMap o1, HashMap o2)->o1['@timestamp'].millis.compareTo(o2['@timestamp'].millis));
                  def size = all_docs.size();
                  def entryPage = all_docs[0]['page'];
                  def exitPage = all_docs[size-1]['page'];
                  def startTime = all_docs[0]['@timestamp'];

                  def lastTime = all_docs[size-1]['@timestamp'];
                  def lastDuration = all_docs[size-1]['duration'];
                  def endTimeInstant = Instant.ofEpochMilli(lastTime.millis).plusMillis((long)lastDuration);
                  def endTime = ZonedDateTime.ofInstant(endTimeInstant, ZoneId.of('Z'));

                  def duration = endTimeInstant.toEpochMilli() - startTime.millis;
                  def result = new HashMap();
                  result['entryPage'] = entryPage;
                  result['exitPage'] = exitPage;
                  result['startTime'] = startTime;
                  result['endTime'] = endTime;
                  result['duration'] = duration;
                  return result;
                `,
              },
            },
          },
        },
        dest: {
          index: `${indexPrefix}-sessions`,
        },
      },
    });
  }

  const { body: transformStats } = await client.transform.getTransformStats({
    transform_id: transformId,
  });
  for (const transform of transformStats.transforms) {
    if (transform.state === 'failed') {
      console.log(
        `Transform "${transform.id}" is in state "${transform.state}"\n${transform.reason}`
      );
    } else if (
      transform.state !== 'indexing' &&
      transform.state !== 'started'
    ) {
      const startTransform = await askConsent(
        rl,
        `Transform "${transform.id}" is in state "${transform.state}". Do you want to start it?`,
        true
      );
      if (startTransform) {
        console.log(`Starting transform "${transform.id}"...`);
        await client.transform.startTransform({ transform_id: transform.id });
      }
    }
  }
}

async function ask(rl: readline.ReadLine, question: string): Promise<string> {
  return new Promise<string>((resolve) => {
    rl.question(question, (result) => resolve(result));
  });
}

async function askConsent(
  rl: readline.ReadLine,
  question: string,
  defaultResult?: boolean
): Promise<boolean> {
  const hint = `[${defaultResult === true ? 'Y' : 'y'}/${
    defaultResult === false ? 'N' : 'n'
  }]`;
  const answer = await ask(rl, `${question} ${hint}`);
  if (answer.toLowerCase() === 'y') {
    return true;
  } else if (answer.toLowerCase() === 'n') {
    return false;
  } else if (answer === '' && typeof defaultResult === 'boolean') {
    return defaultResult;
  } else {
    return askConsent(rl, question, defaultResult);
  }
}

async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
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

    try {
      console.log(`node: ${process.env.ELASTICSEARCH_NODE}`);
      console.log(`prefix: ${process.env.INDEX_PREFIX}`);

      if (await askConsent(rl, `Setup elasticsearch?`, false)) {
        await initialize(rl, client, process.env.INDEX_PREFIX);
      }
    } finally {
      await client.close();
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  if (err instanceof ResponseError) {
    console.error(JSON.stringify(err.meta.body.error, null, 2));
  } else {
    console.error(err);
  }
  process.exit(1);
});
