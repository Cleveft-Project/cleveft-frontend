import { Redirect } from 'expo-router';
import React from 'react';

import { useAuth } from '@/state/auth-context';

/**
 * Entry point. The auth gate in the root layout does the real work; this just
 * picks a landing route so "/" is never a dead end.
 */
export default function Index() {
  const { isAuthenticated } = useAuth();
  // Onboarding rather than welcome for a signed-out visitor: its whole job is
  // to convince someone who has not committed, so it has to come before the
  // account, not after it.
  return <Redirect href={isAuthenticated ? '/home' : '/onboarding'} />;
}
