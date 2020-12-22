import { NextApiHandler } from 'next';
import nextAuth from 'next-auth';
import Providers from 'next-auth/providers';

if (!process.env.GITHUB_ID) {
  throw new Error('Missing env variable "GITHUB_ID"');
} else if (!process.env.GITHUB_SECRET) {
  throw new Error('Missing env variable "GITHUB_SECRET"');
}

const options = {
  // Configure one or more authentication providers
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      scope: 'user:email',
    }),
    // ...add more providers here
  ],
};

export default ((req, res) => nextAuth(req, res, options)) as NextApiHandler;
