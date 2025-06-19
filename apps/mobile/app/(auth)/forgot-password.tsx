import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
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
// @ts-expect-error - Expo vector icons
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const { signIn, isLoaded } = useSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [resendTimer, setResendTimer] = useState(0);

  const validateEmail = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!emailAddress) {
      newErrors.email = ValidationRules.email.required;
    } else if (!ValidationRules.email.pattern.value.test(emailAddress)) {
      newErrors.email = ValidationRules.email.pattern.message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateResetForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!code || code.length !== 6) {
      newErrors.code = "Please enter the 6-digit verification code";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendResetCode = async () => {
    if (!isLoaded || !validateEmail()) {
      await PlatformHaptics.error();
      return;
    }

    setLoading(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: emailAddress,
      });
      await PlatformHaptics.success();
      setSuccessfulCreation(true);
      startResendTimer();
    } catch (err: any) {
      console.error("Password reset error:", err);
      await PlatformHaptics.error();
      
      let errorMessage = "Failed to send reset code. Please try again.";
      
      if (err.errors?.[0]?.message) {
        errorMessage = err.errors[0].message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    
    setResendLoading(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: emailAddress,
      });
      await PlatformHaptics.light();
      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
      startResendTimer();
    } catch (err: any) {
      console.error("Resend error:", err);
      await PlatformHaptics.error();
      Alert.alert("Error", "Failed to resend code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isLoaded || !validateResetForm()) {
      await PlatformHaptics.error();
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      if (result.status === "complete") {
        await PlatformHaptics.success();
        Alert.alert(
          "Password Reset Complete",
          "Your password has been successfully reset. You can now sign in with your new password.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(auth)/sign-in"),
            },
          ]
        );
      }
    } catch (err: any) {
      console.error("Password reset confirmation error:", err);
      await PlatformHaptics.error();
      
      let errorMessage = "Failed to reset password. Please try again.";
      
      if (err.errors?.[0]?.message) {
        errorMessage = err.errors[0].message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (successfulCreation) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={64} color={Colors.primary[500]} />
              </View>
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We've sent a password reset code to {emailAddress}
              </Text>
            </View>

            <View style={styles.form}>
              <PlatformInput
                label="Reset Code"
                value={code}
                onChangeText={setCode}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                error={errors.code}
                required
                leftIcon="key-outline"
              />

              <PlatformInput
                label="New Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your new password"
                secureTextEntry
                autoComplete="password-new"
                hint="Must be at least 8 characters"
                error={errors.password}
                required
                leftIcon="lock-closed-outline"
              />

              <PlatformInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your new password"
                secureTextEntry
                autoComplete="password-new"
                error={errors.confirmPassword}
                required
                leftIcon="lock-closed-outline"
              />

              <PlatformButton
                title="Reset Password"
                onPress={handleResetPassword}
                loading={loading}
                style={styles.resetButton}
              />

              <PlatformButton
                title={resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                variant="outline"
                onPress={handleResendCode}
                loading={resendLoading}
                disabled={resendTimer > 0 || resendLoading}
                style={styles.resendButton}
              />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Remember your password?</Text>
              <Link href="/(auth)/sign-in" asChild>
                <Button title="Sign In" variant="ghost" />
              </Link>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-open-outline" size={64} color={Colors.primary[500]} />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a code to reset your password
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

            <PlatformButton
              title="Send Reset Code"
              onPress={handleSendResetCode}
              loading={loading}
              style={styles.sendButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password?</Text>
            <Link href="/(auth)/sign-in" asChild>
              <Button title="Sign In" variant="ghost" />
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
    justifyContent: "center",
  },
  
  header: {
    alignItems: "center",
    marginBottom: Layout.spacing.xxl,
  },

  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Layout.spacing.lg,
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

  sendButton: {
    marginTop: Layout.spacing.md,
  },

  resetButton: {
    marginTop: Layout.spacing.md,
  },

  resendButton: {
    marginTop: Layout.spacing.sm,
  },
});