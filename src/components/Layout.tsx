import * as React from 'react';
import { signIn, signOut, useSession } from 'next-auth/client';

export interface LayoutProps {
  children?: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [session, loading] = useSession();
  return (
    <>
      <div>
        {!session && (
          <>
            Not signed in <br />
            <button onClick={() => signIn()}>Sign in</button>
          </>
        )}
        {session && (
          <>
            Signed in as {session.user.name || session.user.email} <br />
            <button onClick={() => signOut()}>Sign out</button>
          </>
        )}
      </div>
      {session && children}
    </>
  );
}