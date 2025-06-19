import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
// @ts-expect-error - Expo vector icons
import { Ionicons } from '@expo/vector-icons';
// @ts-expect-error - Clerk Expo types
import { useSignIn, useSignUp, useOAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { Colors, Layout } from '../../constants';
import PlatformButton from '../ui/PlatformButton';
import PlatformHaptics from '../../utils/PlatformHaptics';

interface SocialAuthButtonsProps {
  mode: 'sign-in' | 'sign-up';
  onSuccess?: () => void;
  loading?: boolean;
  setLoading?: (loading: boolean) => void;
}

export default function SocialAuthButtons({
  mode,
  onSuccess,
  loading = false,
  setLoading,
}: SocialAuthButtonsProps) {
  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { startOAuthFlow: googleAuth } = useOAuth({ strategy: 'oauth_google' });

  const handleGoogleAuth = async () => {
    if (loading) return;
    
    setLoading?.(true);
    await PlatformHaptics.light();

    try {
      const { createdSessionId, signIn: oauthSignIn, signUp: oauthSignUp, setActive } = await googleAuth();

      if (createdSessionId) {
        // User completed OAuth flow
        await setActive({ session: createdSessionId });
        await PlatformHaptics.success();
        
        if (mode === 'sign-up') {
          // New user, redirect to profile setup
          router.replace('/profile-setup');
        } else {
          // Existing user, redirect to main app
          router.replace('/(tabs)/search');
        }
        
        onSuccess?.();
      } else if (oauthSignIn) {
        // Additional verification steps needed for sign in
        await setActiveSignIn({ session: oauthSignIn.createdSessionId });
        router.replace('/(tabs)/search');
      } else if (oauthSignUp) {
        // Additional verification steps needed for sign up
        await setActiveSignUp({ session: oauthSignUp.createdSessionId });
        router.replace('/profile-setup');
      }
    } catch (err: any) {
      console.error('Google auth error:', err);
      await PlatformHaptics.error();
      
      let errorMessage = 'Google authentication failed. Please try again.';
      if (err.errors?.[0]?.message) {
        errorMessage = err.errors[0].message;
      }
      
      Alert.alert('Authentication Failed', errorMessage);
    } finally {
      setLoading?.(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>
          or {mode === 'sign-in' ? 'sign in' : 'sign up'} with
        </Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.buttonsContainer}>
        {/* Google */}
        <PlatformButton
          title="Continue with Google"
          onPress={handleGoogleAuth}
          variant="outline"
          style={styles.googleButton}
          textStyle={styles.googleButtonText}
          icon={<Ionicons name="logo-google" size={20} color="#DB4437" />}
          iconPosition="left"
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Layout.spacing.lg,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.primary,
  },

  dividerText: {
    paddingHorizontal: Layout.spacing.md,
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  buttonsContainer: {
    gap: Layout.spacing.sm,
  },

  googleButton: {
    backgroundColor: Colors.background.primary,
    borderColor: Colors.border.primary,
    borderWidth: 1,
  },

  googleButtonText: {
    color: Colors.text.primary,
    fontWeight: '500',
  },
});