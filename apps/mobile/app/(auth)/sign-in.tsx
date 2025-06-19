import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
// @ts-expect-error clerk expo types
import { useSignIn } from "@clerk/clerk-expo";
import { Button, Input } from "../../components/ui";
import { Colors, Layout } from "../../constants";
import { ValidationRules } from "../../utils/validation";
import PlatformInput from "../../components/ui/PlatformInput";
import PlatformButton from "../../components/ui/PlatformButton";
import PlatformHaptics from "../../utils/PlatformHaptics";
import { useMatrimonyAppRating } from "../../hooks/useAppRating";
import SocialAuthButtons from "../../components/auth/SocialAuthButtons";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const rating = useMatrimonyAppRating();

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Email validation
    if (!emailAddress) {
      newErrors.email = ValidationRules.email.required;
    } else if (!ValidationRules.email.pattern.value.test(emailAddress)) {
      newErrors.email = ValidationRules.email.pattern.message;
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!isLoaded || !validateForm()) {
      await PlatformHaptics.error();
      return;
    }

    setLoading(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === "complete") {
        await PlatformHaptics.success();
        await setActive({ session: signInAttempt.createdSessionId });
        
        // Record significant event for app rating
        await rating.recordSignificantEvent('user_signed_in');
        
        router.replace("/(tabs)/search");
      } else {
        // Handle additional verification steps if needed
        console.error("Sign in incomplete", signInAttempt);
        await PlatformHaptics.warning();
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      await PlatformHaptics.error();
      
      let errorMessage = "Sign in failed. Please try again.";

      if (err.errors?.[0]?.message) {
        errorMessage = err.errors[0].message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert("Sign In Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to your account to continue
            </Text>
          </View>

          <View style={styles.form}>
            <PlatformInput
              label="Email Address"
              value={emailAddress}
              onChangeText={setEmailAddress}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              required
              leftIcon="mail-outline"
            />

            <PlatformInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoComplete="password"
              error={errors.password}
              required
              leftIcon="lock-closed-outline"
            />

            <View style={styles.forgotPasswordContainer}>
              <Link href="/(auth)/forgot-password" asChild>
                <Button title="Forgot Password?" variant="ghost" size="sm" />
              </Link>
            </View>

            <PlatformButton
              title="Sign In"
              onPress={handleSignIn}
              loading={loading}
              style={styles.signInButton}
            />
          </View>

          <SocialAuthButtons 
            mode="sign-in" 
            loading={loading}
            setLoading={setLoading}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <Link href="/(auth)/sign-up" asChild>
              <Button title="Sign Up" variant="ghost" />
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.spacing.lg,
    justifyContent: "center",
  },

  header: {
    alignItems: "center",
    marginBottom: Layout.spacing.xxl,
  },

  title: {
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },

  subtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
  },

  form: {
    marginBottom: Layout.spacing.xl,
  },

  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: Layout.spacing.lg,
  },

  signInButton: {
    marginTop: Layout.spacing.md,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Layout.spacing.xs,
  },

  footerText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
});
