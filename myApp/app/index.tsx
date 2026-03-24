import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import React from 'react';

/**
 * Root index component that handles initial redirection.
 * This prevents unauthenticated users from bypassing the login screen
 * by defaulting to the (tabs) index.
 */
export default function Index() {
  const { isSignedIn, isLoading } = useAuth();

  // Wait for authentication state to be restored from storage
  if (isLoading) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
