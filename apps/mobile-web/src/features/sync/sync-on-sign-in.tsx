import { useEffect } from 'react';

import { useAuth } from '@/features/auth/auth-provider';

import { syncAll } from './sync';

/** Runs a sync whenever a user signs in or the app starts with a saved session. Renders nothing. */
export function SyncOnSignIn() {
  const userId = useAuth().session?.user.id;

  useEffect(() => {
    if (userId) syncAll().catch(() => undefined);
  }, [userId]);

  return null;
}
