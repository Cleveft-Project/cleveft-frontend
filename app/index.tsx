import { Redirect } from 'expo-router';
import React from 'react';

import { useAuth } from '@/state/auth-context';

/**
 * Entry point. The auth gate in the root layout does the real work; this just
 * picks a landing route so "/" is never a dead end.
 */
export default function Index() {
  const { isAuthenticated } = useAuth();
  return <Redirect href={isAuthenticated ? '/home' : '/welcome'} />;
}
