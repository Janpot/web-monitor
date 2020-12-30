import { NextApiHandler } from 'next';
import nextAuth, { InitOptions } from 'next-auth';
import Providers from 'next-auth/providers';

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('Missing env variable "GOOGLE_CLIENT_ID"');
} else if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing env variable "GOOGLE_CLIENT_SECRET"');
}

const options: InitOptions = {
  providers: [
    Providers.Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    signIn: async (user, account, profile) => {
      return (
        profile.verified_email &&
        typeof profile.email === 'string' &&
        (['potoms.jan@gmail.com', 'casierj@gmail.com'].includes(
          profile.email
        ) ||
          profile.email.endsWith('@woorank.com'))
      );
    },
  },
};

export default ((req, res) => nextAuth(req, res, options)) as NextApiHandler;
