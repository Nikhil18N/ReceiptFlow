import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';

/**
 * Auth group layout.
 * If the user is already signed in, redirect them to the protected app.
 */
export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  // Wait for Clerk to finish loading session state
  if (!isLoaded) return null;

  // Already authenticated — send to dashboard
  if (isSignedIn) {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
