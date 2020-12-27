import { getSession } from 'next-auth/client';
import { NextApiHandler } from 'next';
import { getUserProperties } from '../../lib/database';

export default (async (req, res) => {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).end();
  }
  const properties = await getUserProperties(/* from session */);
  res.json(properties);
}) as NextApiHandler;
