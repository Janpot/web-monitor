import { NextApiHandler } from 'next';

export default (async (req, res) => {
  const event = JSON.parse(req.body);
  console.log(event);
  res.setHeader('access-control-allow-origin', '*');
  res.send('OK');
}) as NextApiHandler;
