import { getSession } from 'next-auth/client';
import { NextApiHandler } from 'next';
import { getProperty } from '../../../../lib/database';

export default (async (req, res) => {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).end();
  }
  const property = await getProperty(
    /* user from session, */ req.query.property as string
  );
  res.json(property);
}) as NextApiHandler;
