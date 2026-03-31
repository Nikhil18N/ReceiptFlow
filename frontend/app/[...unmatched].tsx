import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';

/**
 * Catch-all route for any unmatched paths.
 * This handles OAuth callback redirects and any other deep links
 * that don't match a specific route.
 *
 * It simply redirects based on auth state:
 *  - Signed in  → Dashboard
 *  - Signed out → Login
 */
export default function CatchAll() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
