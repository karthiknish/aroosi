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
import { useSignUp } from "@clerk/clerk-expo";
import { Button, Input } from "../../components/ui";
import { Colors, Layout } from "../../constants";
import { ValidationRules } from "../../utils/validation";
import PlatformInput from "../../components/ui/PlatformInput";
import PlatformButton from "../../components/ui/PlatformButton";
import PlatformHaptics from "../../utils/PlatformHaptics";
import { useMatrimonyAppRating } from "../../hooks/useAppRating";
import SocialAuthButtons from "../../components/auth/SocialAuthButtons";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
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
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!isLoaded || !validateForm()) {
      await PlatformHaptics.error();
      return;
    }

    setLoading(true);
    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      await PlatformHaptics.success();
      setPendingVerification(true);
    } catch (err: any) {
      console.error("Sign up error:", err);
      await PlatformHaptics.error();
      
      let errorMessage = "Sign up failed. Please try again.";

      if (err.errors?.[0]?.message) {
        errorMessage = err.errors[0].message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert("Sign Up Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (completeSignUp.status === "complete") {
        await PlatformHaptics.success();
        await setActive({ session: completeSignUp.createdSessionId });
        
        // Record significant event for app rating
        await rating.recordSignificantEvent('user_signed_up');
        
        router.replace("/profile-setup");
      } else {
        console.error("Verification incomplete", completeSignUp);
        await PlatformHaptics.warning();
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      await PlatformHaptics.error();
      
      let errorMessage = "Verification failed. Please try again.";

      if (err.errors?.[0]?.message) {
        errorMessage = err.errors[0].message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert("Verification Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.verificationContainer}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We&apos;ve sent a verification code to {emailAddress}
          </Text>

          <PlatformInput
            label="Verification Code"
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholder="Enter 6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            required
            leftIcon="key-outline"
          />

          <PlatformButton
            title="Verify Email"
            onPress={handleVerification}
            loading={loading}
            disabled={loading || verificationCode.length !== 6}
            style={styles.verifyButton}
          />

          <PlatformButton
            title="Resend Code"
            variant="outline"
            onPress={() =>
              signUp?.prepareEmailAddressVerification({
                strategy: "email_code",
              })
            }
            style={styles.resendButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Join thousands finding meaningful connections
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
              placeholder="Create a strong password"
              secureTextEntry
              autoComplete="password-new"
              error={errors.password}
              hint="Must be at least 8 characters"
              required
              leftIcon="lock-closed-outline"
            />

            <PlatformInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
              autoComplete="password-new"
              error={errors.confirmPassword}
              required
              leftIcon="lock-closed-outline"
            />

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{" "}
                <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            <PlatformButton
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              style={styles.createButton}
            />
          </View>

          <SocialAuthButtons 
            mode="sign-up" 
            loading={loading}
            setLoading={setLoading}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/(auth)/sign-in" asChild>
              <Button title="Sign In" variant="ghost" />
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

  verificationContainer: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
    justifyContent: "center",
    gap: Layout.spacing.lg,
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
    textAlign: "center",
  },

  subtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
  },

  form: {
    marginBottom: Layout.spacing.xl,
  },

  termsContainer: {
    marginBottom: Layout.spacing.lg,
  },

  termsText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: Layout.typography.lineHeight.sm,
  },

  termsLink: {
    color: Colors.primary[500],
    fontWeight: Layout.typography.fontWeight.medium,
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

  createButton: {
    marginTop: Layout.spacing.md,
  },

  verifyButton: {
    marginTop: Layout.spacing.md,
  },

  resendButton: {
    marginTop: Layout.spacing.sm,
  },
});
