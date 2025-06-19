import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Card } from "../components/ui";
import { Colors, Layout } from "../constants";
import { useApiClient } from "../utils/api";

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactScreen() {
  const apiClient = useApiClient();
  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<ContactForm>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactForm> = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!form.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!form.message.trim()) {
      newErrors.message = "Message is required";
    } else if (form.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.submitContact(form);
      
      if (response.success) {
        Alert.alert(
          "Message Sent!",
          "Thank you for contacting us. We'll get back to you within 24 hours.",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
        
        // Reset form
        setForm({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      Alert.alert(
        "Error",
        "Failed to send your message. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: keyof ContactForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const contactMethods = [
    {
      icon: "mail-outline",
      title: "Email",
      value: "support@aroosi.co.uk",
      action: "mailto:support@aroosi.co.uk",
    },
    {
      icon: "time-outline",
      title: "Response Time",
      value: "Within 24 hours",
      action: null,
    },
    {
      icon: "location-outline",
      title: "Based in",
      value: "United Kingdom",
      action: null,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Ionicons name="chatbubble-ellipses" size={32} color={Colors.primary[500]} />
            </View>
            <Text style={styles.heroTitle}>Get in Touch</Text>
            <Text style={styles.heroDescription}>
              Have questions or need help? We're here to assist you on your journey to finding your perfect match.
            </Text>
          </View>

          {/* Contact Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.contactMethodsContainer}>
              {contactMethods.map((method, index) => (
                <View key={index} style={styles.contactMethod}>
                  <View style={styles.contactMethodIcon}>
                    <Ionicons name={method.icon as any} size={20} color={Colors.primary[500]} />
                  </View>
                  <View style={styles.contactMethodText}>
                    <Text style={styles.contactMethodTitle}>{method.title}</Text>
                    <Text style={styles.contactMethodValue}>{method.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Contact Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send us a Message</Text>
            <Card style={styles.formCard}>
              {/* Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <Input
                  value={form.name}
                  onChangeText={(text) => updateForm("name", text)}
                  placeholder="Enter your full name"
                  style={[styles.formInput, errors.name && styles.errorInput]}
                />
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
              </View>

              {/* Email */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email Address *</Text>
                <Input
                  value={form.email}
                  onChangeText={(text) => updateForm("email", text)}
                  placeholder="Enter your email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.formInput, errors.email && styles.errorInput]}
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              {/* Subject */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Subject *</Text>
                <Input
                  value={form.subject}
                  onChangeText={(text) => updateForm("subject", text)}
                  placeholder="What can we help you with?"
                  style={[styles.formInput, errors.subject && styles.errorInput]}
                />
                {errors.subject && (
                  <Text style={styles.errorText}>{errors.subject}</Text>
                )}
              </View>

              {/* Message */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Message *</Text>
                <Input
                  value={form.message}
                  onChangeText={(text) => updateForm("message", text)}
                  placeholder="Please describe how we can help you..."
                  multiline
                  numberOfLines={5}
                  style={[
                    styles.formInput,
                    styles.messageInput,
                    errors.message && styles.errorInput,
                  ]}
                />
                {errors.message && (
                  <Text style={styles.errorText}>{errors.message}</Text>
                )}
              </View>

              <Button
                title="Send Message"
                onPress={handleSubmit}
                loading={loading}
                style={styles.submitButton}
              />
            </Card>
          </View>

          {/* FAQ Link */}
          <View style={styles.section}>
            <Card style={styles.faqCard}>
              <View style={styles.faqContent}>
                <View style={styles.faqIcon}>
                  <Ionicons name="help-circle-outline" size={24} color={Colors.primary[500]} />
                </View>
                <View style={styles.faqText}>
                  <Text style={styles.faqTitle}>Looking for Quick Answers?</Text>
                  <Text style={styles.faqDescription}>
                    Check out our FAQ section for immediate answers to common questions.
                  </Text>
                </View>
              </View>
              <Button
                title="View FAQ"
                variant="outline"
                size="sm"
                onPress={() => router.push("/faq")}
                style={styles.faqButton}
              />
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  backButton: {
    padding: Layout.spacing.xs,
    marginRight: Layout.spacing.sm,
  },
  
  headerTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  
  keyboardContainer: {
    flex: 1,
  },
  
  content: {
    flex: 1,
  },
  
  heroSection: {
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.xl,
    backgroundColor: Colors.background.primary,
  },
  
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Layout.spacing.lg,
  },
  
  heroTitle: {
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  
  heroDescription: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: Layout.typography.lineHeight.relaxed,
  },
  
  section: {
    padding: Layout.spacing.lg,
  },
  
  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.lg,
  },
  
  contactMethodsContainer: {
    gap: Layout.spacing.md,
  },
  
  contactMethod: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  
  contactMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
  },
  
  contactMethodText: {
    flex: 1,
  },
  
  contactMethodTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  
  contactMethodValue: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  
  formCard: {
    padding: Layout.spacing.lg,
    gap: Layout.spacing.lg,
  },
  
  formGroup: {
    gap: Layout.spacing.sm,
  },
  
  formLabel: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  
  formInput: {
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
  },
  
  messageInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  
  errorInput: {
    borderColor: Colors.error[500],
  },
  
  errorText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.error[500],
  },
  
  submitButton: {
    marginTop: Layout.spacing.md,
  },
  
  faqCard: {
    padding: Layout.spacing.lg,
    gap: Layout.spacing.md,
  },
  
  faqContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.md,
  },
  
  faqIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
  },
  
  faqText: {
    flex: 1,
  },
  
  faqTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  
  faqDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: Layout.typography.lineHeight.base,
  },
  
  faqButton: {
    alignSelf: "flex-start",
  },
});