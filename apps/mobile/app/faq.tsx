import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Card, Input } from "../components/ui";
import { Colors, Layout } from "../constants";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface FAQCategory {
  id: string;
  name: string;
  icon: string;
}

export default function FAQScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [animations] = useState(new Map<string, Animated.Value>());

  const categories: FAQCategory[] = [
    { id: "all", name: "All", icon: "apps-outline" },
    { id: "general", name: "General", icon: "help-circle-outline" },
    { id: "profile", name: "Profile", icon: "person-outline" },
    { id: "matching", name: "Matching", icon: "heart-outline" },
    { id: "premium", name: "Premium", icon: "star-outline" },
    { id: "safety", name: "Safety", icon: "shield-outline" },
    { id: "technical", name: "Technical", icon: "settings-outline" },
  ];

  const faqItems: FAQItem[] = [
    {
      id: "1",
      category: "general",
      question: "What is Aroosi?",
      answer: "Aroosi is a matrimonial platform specifically designed for Afghan singles in the UK to find their life partners while respecting cultural values and traditions.",
    },
    {
      id: "2",
      category: "general",
      question: "Is Aroosi free to use?",
      answer: "Aroosi offers both free and premium plans. Free users can create profiles and browse matches with some limitations. Premium users get unlimited access to all features.",
    },
    {
      id: "3",
      category: "profile",
      question: "How do I create a profile?",
      answer: "After signing up, you'll be guided through a 6-step profile creation process including basic information, location, cultural background, education, about you, and photos.",
    },
    {
      id: "4",
      category: "profile",
      question: "Can I hide my profile?",
      answer: "Yes, premium users can choose to hide their profile from free users. You can also set your profile to be hidden from search temporarily.",
    },
    {
      id: "5",
      category: "matching",
      question: "How does matching work?",
      answer: "Our matching system uses your preferences like age, location, education, and cultural background to suggest compatible profiles. You can send interests to profiles you like.",
    },
    {
      id: "6",
      category: "matching",
      question: "What happens when someone likes my profile?",
      answer: "You'll receive a notification about the interest. You can then view their profile and decide to accept or decline. If both parties accept, you can start messaging.",
    },
    {
      id: "7",
      category: "premium",
      question: "What are the premium benefits?",
      answer: "Premium users get unlimited likes, can chat with all matches, access advanced filters, profile boost feature, and can hide from free users.",
    },
    {
      id: "8",
      category: "premium",
      question: "How much does premium cost?",
      answer: "Premium costs £14.99/month and Premium Plus costs £39.99/month. Both include all premium features with Premium Plus offering additional priority support.",
    },
    {
      id: "9",
      category: "safety",
      question: "How do you verify profiles?",
      answer: "All profiles go through manual review before being approved. We also have reporting systems and community guidelines to maintain a safe environment.",
    },
    {
      id: "10",
      category: "safety",
      question: "Can I block or report someone?",
      answer: "Yes, you can block or report any user that makes you uncomfortable. We take all reports seriously and investigate them promptly.",
    },
    {
      id: "11",
      category: "technical",
      question: "Why can't I log in?",
      answer: "Make sure you're using the correct email and password. If you've forgotten your password, use the 'Forgot Password' option to reset it.",
    },
    {
      id: "12",
      category: "technical",
      question: "The app is running slowly, what should I do?",
      answer: "Try closing and reopening the app, ensure you have a stable internet connection, and make sure you're using the latest version of the app.",
    },
  ];

  const getAnimation = (id: string): Animated.Value => {
    if (!animations.has(id)) {
      animations.set(id, new Animated.Value(0));
    }
    return animations.get(id)!;
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    const animation = getAnimation(id);
    
    if (expandedItems.has(id)) {
      newExpanded.delete(id);
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      newExpanded.add(id);
      Animated.timing(animation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    
    setExpandedItems(newExpanded);
  };

  const filteredFAQs = faqItems.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const renderCategory = (category: FAQCategory) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryButton,
        selectedCategory === category.id && styles.selectedCategoryButton,
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Ionicons 
        name={category.icon as any} 
        size={16} 
        color={selectedCategory === category.id ? Colors.background.primary : Colors.primary[500]} 
      />
      <Text
        style={[
          styles.categoryButtonText,
          selectedCategory === category.id && styles.selectedCategoryButtonText,
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderFAQItem = (item: FAQItem) => {
    const isExpanded = expandedItems.has(item.id);
    const animation = getAnimation(item.id);
    
    const maxHeight = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 200], // Adjust based on content
    });

    return (
      <Card key={item.id} style={styles.faqCard}>
        <TouchableOpacity
          style={styles.faqHeader}
          onPress={() => toggleExpanded(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.faqQuestion}>{item.question}</Text>
          <View style={styles.faqToggle}>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={Colors.primary[500]}
            />
          </View>
        </TouchableOpacity>
        
        <Animated.View style={[styles.faqAnswerContainer, { maxHeight }]}>
          <View style={styles.faqAnswerPadding}>
            <Text style={styles.faqAnswer}>{item.answer}</Text>
          </View>
        </Animated.View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="help-circle" size={32} color={Colors.primary[500]} />
          </View>
          <Text style={styles.heroTitle}>Frequently Asked Questions</Text>
          <Text style={styles.heroDescription}>
            Find quick answers to common questions about Aroosi
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.neutral[400]} />
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search questions..."
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color={Colors.neutral[400]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContainer}
          >
            {categories.map(renderCategory)}
          </ScrollView>
        </View>

        {/* FAQ Items */}
        <View style={styles.faqSection}>
          {filteredFAQs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={Colors.neutral[300]} />
              <Text style={styles.emptyTitle}>No FAQs found</Text>
              <Text style={styles.emptyDescription}>
                {searchQuery 
                  ? "Try adjusting your search terms" 
                  : "No questions available for this category"}
              </Text>
            </View>
          ) : (
            <View style={styles.faqList}>
              {filteredFAQs.map(renderFAQItem)}
            </View>
          )}
        </View>

        {/* Contact Support */}
        <View style={styles.supportSection}>
          <Card style={styles.supportCard}>
            <View style={styles.supportContent}>
              <View style={styles.supportIcon}>
                <Ionicons name="chatbubble-ellipses" size={24} color={Colors.primary[500]} />
              </View>
              <View style={styles.supportText}>
                <Text style={styles.supportTitle}>Still need help?</Text>
                <Text style={styles.supportDescription}>
                  Can't find what you're looking for? Contact our support team.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => router.push("/contact")}
            >
              <Text style={styles.supportButtonText}>Contact Support</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary[500]} />
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
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
  },
  
  searchSection: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
  },
  
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    gap: Layout.spacing.sm,
  },
  
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  
  categoriesSection: {
    backgroundColor: Colors.background.primary,
    paddingBottom: Layout.spacing.md,
  },
  
  categoriesScrollContainer: {
    paddingHorizontal: Layout.spacing.lg,
    gap: Layout.spacing.sm,
  },
  
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    gap: Layout.spacing.xs,
  },
  
  selectedCategoryButton: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  
  categoryButtonText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  selectedCategoryButtonText: {
    color: Colors.background.primary,
  },
  
  faqSection: {
    padding: Layout.spacing.lg,
  },
  
  faqList: {
    gap: Layout.spacing.md,
  },
  
  faqCard: {
    overflow: "hidden",
  },
  
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Layout.spacing.lg,
  },
  
  faqQuestion: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginRight: Layout.spacing.md,
  },
  
  faqToggle: {
    padding: Layout.spacing.xs,
  },
  
  faqAnswerContainer: {
    overflow: "hidden",
  },
  
  faqAnswerPadding: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.lg,
  },
  
  faqAnswer: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: Layout.typography.lineHeight.relaxed,
  },
  
  emptyState: {
    alignItems: "center",
    paddingVertical: Layout.spacing.xl * 2,
  },
  
  emptyTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.sm,
  },
  
  emptyDescription: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  
  supportSection: {
    padding: Layout.spacing.lg,
    paddingTop: 0,
  },
  
  supportCard: {
    padding: Layout.spacing.lg,
    gap: Layout.spacing.md,
  },
  
  supportContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.md,
  },
  
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
  },
  
  supportText: {
    flex: 1,
  },
  
  supportTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  
  supportDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    backgroundColor: Colors.primary[50],
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  
  supportButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.primary[500],
  },
});