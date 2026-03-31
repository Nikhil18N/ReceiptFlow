import { useOAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Warm up the browser for OAuth (Android)
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogleAuth = useCallback(async () => {
    try {
      setLoading(true);
      const { createdSessionId, setActive, signIn: oauthSignIn, signUp: oauthSignUp } = await startOAuthFlow();
      
      if (createdSessionId && setActive) {
        // OAuth completed perfectly — activate session
        await setActive({ session: createdSessionId });
      } else if (oauthSignUp?.status === 'missing_requirements') {
        // Google OAuth created a user but Clerk needs extra fields.
        // Try completing with what we have — if a session was generated, use it.
        if (oauthSignUp.createdSessionId && setActive) {
          await setActive({ session: oauthSignUp.createdSessionId });
        } else {
          // Force-complete: some Clerk configs auto-fill requirements from OAuth
          // If this still fails, tell user to use email/password
          Alert.alert(
            'Almost Done',
            'Your Google account was linked. Please sign in with Google again to complete setup.'
          );
        }
      } else if (oauthSignIn?.status === 'needs_identifier') {
        // User exists but session wasn't created — retry
        Alert.alert('Sign In', 'Please try signing in with Google again.');
      }
    } catch (err: any) {
      // Don't show error for user cancellation
      const code = err?.errors?.[0]?.code;
      if (code !== 'session_exists' && code !== 'user_cancelled') {
        console.error('OAuth error:', JSON.stringify(err, null, 2));
        Alert.alert('Sign In Error', err.errors?.[0]?.message ?? err.message ?? 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  }, [startOAuthFlow]);

  // ── Email / Password Sign IN ────────────────────────────────────────────
  const handleEmailSignIn = useCallback(async () => {
    if (!isSignInLoaded) return;
    try {
      setLoading(true);
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        router.replace('/(app)');
      }
    } catch (err: any) {
      Alert.alert('Sign In Error', err.errors?.[0]?.message ?? 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  }, [isSignInLoaded, email, password, signIn, setSignInActive]);

  // ── Email / Password Sign UP ────────────────────────────────────────────
  const handleEmailSignUp = useCallback(async () => {
    if (!isSignUpLoaded || !signUp) return;
    try {
      setLoading(true);
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      // Send verification email
      await result.prepareEmailAddressVerification({ strategy: 'email_code' });
      
      Alert.alert(
        'Verify Your Email',
        'We sent a verification code to your email. Please check your inbox.',
        [
          {
            text: 'I have the code',
            onPress: () => promptForVerificationCode(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Sign Up Error', err.errors?.[0]?.message ?? 'Could not create account.');
    } finally {
      setLoading(false);
    }
  }, [isSignUpLoaded, email, password, signUp, setSignUpActive]);

  // ── Email Verification Prompt ────────────────────────────────────────────
  const promptForVerificationCode = () => {
    Alert.prompt?.(
      'Enter Verification Code',
      'Paste the 6-digit code from your email',
      async (code: string) => {
        try {
          if (!signUp) return;
          setLoading(true);
          const result = await signUp.attemptEmailAddressVerification({
            code,
          });
          if (result.status === 'complete') {
            await setSignUpActive({ session: result.createdSessionId });
            router.replace('/(app)');
          }
        } catch (err: any) {
          Alert.alert('Verification Failed', err.errors?.[0]?.message ?? 'Invalid code.');
        } finally {
          setLoading(false);
        }
      },
      'plain-text'
    ) ?? showVerificationAlert();
  };

  // Fallback for Android (no Alert.prompt)
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const showVerificationAlert = () => {
    setShowVerification(true);
  };

  const submitVerificationCode = async () => {
    if (!signUp) return;
    try {
      setLoading(true);
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        setShowVerification(false);
        router.replace('/(app)');
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.errors?.[0]?.message ?? 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = isSignUpMode ? handleEmailSignUp : handleEmailSignIn;

  // ── Verification Code Screen ──────────────────────────────────────────────
  if (showVerification) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.scroll}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.welcomeTitle}>Verify Email</Text>
              <Text style={styles.welcomeSubtitle}>
                Enter the 6-digit code sent to {email}
              </Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>VERIFICATION CODE</Text>
              <TextInput
                style={[styles.input, { textAlign: 'center', fontSize: 22, letterSpacing: 8 }]}
                placeholder="000000"
                placeholderTextColor={Colors.outline}
                keyboardType="number-pad"
                maxLength={6}
                value={verificationCode}
                onChangeText={setVerificationCode}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabled]}
              onPress={submitVerificationCode}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowVerification(false)}>
              <Text style={[styles.forgotLink, { textAlign: 'center', marginTop: 4 }]}>← Back to login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ─────────────────────────────────────────────────── */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIconBg}>
              <Text style={styles.logoIcon}>🧾</Text>
            </View>
            <Text style={styles.appName}>Receipt Flow</Text>
          </View>

          {/* ── Card ─────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.welcomeTitle}>
                {isSignUpMode ? 'Create Account' : 'Welcome back'}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {isSignUpMode
                  ? 'Sign up to start scanning and tracking your receipts.'
                  : 'Please enter your details to access your ledger.'}
              </Text>
            </View>

            {/* Email input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="alex@example.com"
                placeholderTextColor={Colors.outline}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password input */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>PASSWORD</Text>
                {!isSignUpMode && (
                  <TouchableOpacity>
                    <Text style={styles.forgotLink}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.outline}
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {isSignUpMode ? 'Create Account' : 'Login'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google OAuth */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleBtnText}>Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUpMode ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUpMode(!isSignUpMode)}>
              <Text style={styles.signUpLink}>
                {isSignUpMode ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Decorative orbs */}
      <View style={styles.orbBottomLeft} pointerEvents="none" />
      <View style={styles.orbTopRight} pointerEvents="none" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // Logo
  logoContainer: { alignItems: 'center', marginBottom: 32, gap: 8 },
  logoIconBg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.fab,
  },
  logoIcon: { fontSize: 28 },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors['on-surface'],
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.card,
    padding: 32,
    gap: 20,
    ...Shadows.editorial,
  },
  cardHeader: { gap: 6 },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: Colors['on-surface'],
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: Colors['on-surface-variant'],
    lineHeight: 20,
  },

  // Inputs
  fieldGroup: { gap: 8 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: Colors['on-surface-variant'],
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors['surface-container-highest'],
    fontSize: 15,
    color: Colors['on-surface'],
  },

  // Primary button
  primaryBtn: {
    height: 56,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.fab,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  disabled: { opacity: 0.6 },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors['outline-variant'] + '33' },
  dividerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: Colors.outline,
  },

  // Google button
  googleBtn: {
    height: 56,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors['surface-container-low'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors['outline-variant'] + '26',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors['on-surface'],
  },

  // Footer
  footer: { flexDirection: 'row', marginTop: 24, alignItems: 'center' },
  footerText: { fontSize: 14, color: Colors['on-surface-variant'] },
  signUpLink: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // Decorative orbs
  orbBottomLeft: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors['primary-fixed'] + '1A',
    zIndex: -1,
  },
  orbTopRight: {
    position: 'absolute',
    top: '25%',
    right: -40,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors['secondary-fixed'] + '1A',
    zIndex: -1,
  },
});
