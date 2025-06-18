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

export default function ForgotPasswordScreen() {
  const { signIn, isLoaded } = useSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

  const handleSendResetCode = async () => {
    if (!isLoaded || !validateEmail()) return;

    setLoading(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: emailAddress,
      });
      setSuccessfulCreation(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      let errorMessage = "Failed to send reset code. Please try again.";
      
      if (err.errors?.[0]?.message) {
        errorMessage = err.errors[0].message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      if (result.status === "complete") {
        Alert.alert(
          "Password Reset Complete",
          "Your password has been successfully reset.",
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
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We've sent a password reset code to {emailAddress}
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Reset Code"
                value={code}
                onChangeText={setCode}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                required
              />

              <Input
                label="New Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your new password"
                secureTextEntry
                autoComplete="password-new"
                hint="Must be at least 8 characters"
                required
              />

              <Button
                title="Reset Password"
                onPress={handleResetPassword}
                loading={loading}
                disabled={loading || !code || !password}
                fullWidth
              />

              <Button
                title="Resend Code"
                variant="ghost"
                onPress={handleSendResetCode}
                disabled={loading}
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
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a code to reset your password
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email Address"
              value={emailAddress}
              onChangeText={setEmailAddress}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              required
            />

            <Button
              title="Send Reset Code"
              onPress={handleSendResetCode}
              loading={loading}
              disabled={loading}
              fullWidth
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
});