import { getSession } from 'next-auth/client';
import { NextApiHandler } from 'next';
import { getProperty } from '../../../../lib/database';
import { Property } from '../../../../types';

export default (async (req, res) => {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).end();
  }

  const property = await getProperty(
    /* user from session, */ req.query.property as string
  );

  if (!property) {
    return res.status(404).end();
  }

  res.json(property);
}) as NextApiHandler<Property>;
