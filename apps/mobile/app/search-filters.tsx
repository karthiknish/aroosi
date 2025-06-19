import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "../components/ui";
import { Colors, Layout } from "../constants";
import { useStorage } from "../utils/storage";
import { useFeatureGate } from "../hooks/useFeatureGate";
import UpgradePrompt from "../components/subscription/UpgradePrompt";

interface SearchFilters {
  ageMin: string;
  ageMax: string;
  city: string;
  education: string;
  occupation: string;
  maritalStatus: string;
  religion: string;
  sect: string;
  lifestyle: string;
  distance: number;
}

const DEFAULT_FILTERS: SearchFilters = {
  ageMin: "18",
  ageMax: "45",
  city: "any",
  education: "any",
  occupation: "any",
  maritalStatus: "any",
  religion: "any",
  sect: "any",
  lifestyle: "any",
  distance: 50,
};

const MAJOR_UK_CITIES = [
  "any",
  "London",
  "Birmingham",
  "Manchester",
  "Leeds",
  "Glasgow",
  "Liverpool",
  "Newcastle",
  "Sheffield",
  "Bristol",
  "Leicester",
  "Edinburgh",
  "Nottingham",
  "Southampton",
  "Cardiff",
  "Coventry",
  "Bradford",
  "Belfast",
  "Other",
];

const EDUCATION_OPTIONS = [
  "any",
  "High School",
  "College",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD/Doctorate",
  "Professional Qualification",
];

const MARITAL_STATUS_OPTIONS = [
  "any",
  "Never Married",
  "Divorced",
  "Widowed",
];

const RELIGION_OPTIONS = [
  "any",
  "Islam",
  "Other",
];

const SECT_OPTIONS = [
  "any",
  "Sunni",
  "Shia",
  "Other",
];

const LIFESTYLE_OPTIONS = [
  "any",
  "Religious",
  "Moderate",
  "Liberal",
];

export default function SearchFiltersScreen() {
  const storage = useStorage();
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showMaritalStatusModal, setShowMaritalStatusModal] = useState(false);
  const [showReligionModal, setShowReligionModal] = useState(false);
  const [showSectModal, setShowSectModal] = useState(false);
  const [showLifestyleModal, setShowLifestyleModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const { checkAccess, currentTier } = useFeatureGate();

  useEffect(() => {
    loadSavedFilters();
  }, []);

  const loadSavedFilters = async () => {
    try {
      const savedFilters = await storage.getItem("search_filters");
      if (savedFilters) {
        setFilters({ ...DEFAULT_FILTERS, ...JSON.parse(savedFilters) });
      }
    } catch (error) {
      console.error("Error loading saved filters:", error);
    }
  };

  const saveFilters = async () => {
    try {
      setLoading(true);
      await storage.setItem("search_filters", JSON.stringify(filters));
      
      // Navigate back with filters applied
      router.back();
    } catch (error) {
      console.error("Error saving filters:", error);
      Alert.alert("Error", "Failed to save filters. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    Alert.alert(
      "Reset Filters",
      "Are you sure you want to reset all filters to default?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => setFilters(DEFAULT_FILTERS),
        },
      ]
    );
  };

  const updateFilter = (key: keyof SearchFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const renderSelectModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: string[],
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalOptions}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption,
                  selectedValue === option && styles.selectedModalOption,
                ]}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedValue === option && styles.selectedModalOptionText,
                  ]}
                >
                  {option === "any" ? "Any" : option}
                </Text>
                {selectedValue === option && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary[500]} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderFilterRow = (
    label: string,
    value: string,
    onPress: () => void,
    icon: string,
    isPremium: boolean = false
  ) => {
    const hasAccess = isPremium ? checkAccess('use_advanced_filters') : true;
    
    const handlePress = () => {
      if (isPremium && !hasAccess) {
        setShowUpgradePrompt(true);
        return;
      }
      onPress();
    };

    return (
      <TouchableOpacity 
        style={[
          styles.filterRow,
          isPremium && !hasAccess && styles.premiumFilterRow
        ]} 
        onPress={handlePress}
      >
        <View style={styles.filterRowLeft}>
          <Ionicons 
            name={icon as any} 
            size={20} 
            color={isPremium && !hasAccess ? Colors.neutral[400] : Colors.primary[500]} 
          />
          <Text style={[
            styles.filterLabel,
            isPremium && !hasAccess && styles.premiumFilterLabel
          ]}>
            {label}
          </Text>
          {isPremium && !hasAccess && (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={12} color={Colors.warning[600]} />
              <Text style={styles.premiumBadgeText}>Pro</Text>
            </View>
          )}
        </View>
        <View style={styles.filterRowRight}>
          <Text style={[
            styles.filterValue,
            isPremium && !hasAccess && styles.premiumFilterValue
          ]}>
            {isPremium && !hasAccess ? "Premium Feature" : (value === "any" ? "Any" : value)}
          </Text>
          <Ionicons 
            name={isPremium && !hasAccess ? "lock-closed" : "chevron-forward"} 
            size={16} 
            color={Colors.neutral[400]} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderAgeRangeInputs = () => (
    <View style={styles.ageRangeContainer}>
      <View style={styles.ageRangeHeader}>
        <Ionicons name="calendar-outline" size={20} color={Colors.primary[500]} />
        <Text style={styles.filterLabel}>Age Range</Text>
      </View>
      <View style={styles.ageInputsContainer}>
        <View style={styles.ageInputWrapper}>
          <Text style={styles.ageInputLabel}>Min</Text>
          <Input
            value={filters.ageMin}
            onChangeText={(text) => updateFilter("ageMin", text)}
            placeholder="18"
            keyboardType="numeric"
            style={styles.ageInput}
          />
        </View>
        <Text style={styles.ageRangeSeparator}>to</Text>
        <View style={styles.ageInputWrapper}>
          <Text style={styles.ageInputLabel}>Max</Text>
          <Input
            value={filters.ageMax}
            onChangeText={(text) => updateFilter("ageMax", text)}
            placeholder="45"
            keyboardType="numeric"
            style={styles.ageInput}
          />
        </View>
      </View>
    </View>
  );

  const renderDistanceSlider = () => (
    <View style={styles.distanceContainer}>
      <View style={styles.distanceHeader}>
        <Ionicons name="location-outline" size={20} color={Colors.primary[500]} />
        <Text style={styles.filterLabel}>Maximum Distance</Text>
        <Text style={styles.distanceValue}>{filters.distance} miles</Text>
      </View>
      <View style={styles.distanceSliderContainer}>
        {/* Note: You would need to install a slider library like @react-native-community/slider */}
        {/* For now, using touch buttons as alternative */}
        <View style={styles.distanceButtons}>
          {[10, 25, 50, 100, 200].map((distance) => (
            <TouchableOpacity
              key={distance}
              style={[
                styles.distanceButton,
                filters.distance === distance && styles.selectedDistanceButton,
              ]}
              onPress={() => updateFilter("distance", distance)}
            >
              <Text
                style={[
                  styles.distanceButtonText,
                  filters.distance === distance && styles.selectedDistanceButtonText,
                ]}
              >
                {distance}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Filters</Text>
        <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Age Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Preferences</Text>
          {renderAgeRangeInputs()}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          {renderFilterRow("City", filters.city, () => setShowCityModal(true), "location-outline")}
          {renderDistanceSlider()}
        </View>

        {/* Background */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Background</Text>
          {renderFilterRow("Education", filters.education, () => setShowEducationModal(true), "school-outline")}
          {renderFilterRow("Marital Status", filters.maritalStatus, () => setShowMaritalStatusModal(true), "heart-outline")}
        </View>

        {/* Religious Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Religious Preferences</Text>
          {renderFilterRow("Religion", filters.religion, () => setShowReligionModal(true), "book-outline")}
          {renderFilterRow("Sect", filters.sect, () => setShowSectModal(true), "library-outline")}
          {renderFilterRow("Lifestyle", filters.lifestyle, () => setShowLifestyleModal(true), "star-outline")}
        </View>
      </ScrollView>

      {/* Apply Button */}
      <View style={styles.bottomContainer}>
        <Button
          title="Apply Filters"
          onPress={saveFilters}
          loading={loading}
          style={styles.applyButton}
        />
      </View>

      {/* Modals */}
      {renderSelectModal(
        showCityModal,
        () => setShowCityModal(false),
        "Select City",
        MAJOR_UK_CITIES,
        filters.city,
        (value) => updateFilter("city", value)
      )}
      
      {renderSelectModal(
        showEducationModal,
        () => setShowEducationModal(false),
        "Select Education Level",
        EDUCATION_OPTIONS,
        filters.education,
        (value) => updateFilter("education", value)
      )}
      
      {renderSelectModal(
        showMaritalStatusModal,
        () => setShowMaritalStatusModal(false),
        "Select Marital Status",
        MARITAL_STATUS_OPTIONS,
        filters.maritalStatus,
        (value) => updateFilter("maritalStatus", value)
      )}
      
      {renderSelectModal(
        showReligionModal,
        () => setShowReligionModal(false),
        "Select Religion",
        RELIGION_OPTIONS,
        filters.religion,
        (value) => updateFilter("religion", value)
      )}
      
      {renderSelectModal(
        showSectModal,
        () => setShowSectModal(false),
        "Select Sect",
        SECT_OPTIONS,
        filters.sect,
        (value) => updateFilter("sect", value)
      )}
      
      {renderSelectModal(
        showLifestyleModal,
        () => setShowLifestyleModal(false),
        "Select Lifestyle",
        LIFESTYLE_OPTIONS,
        filters.lifestyle,
        (value) => updateFilter("lifestyle", value)
      )}
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
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  backButton: {
    padding: Layout.spacing.xs,
  },
  
  headerTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  
  resetButton: {
    padding: Layout.spacing.xs,
  },
  
  resetButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[500],
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  content: {
    flex: 1,
    padding: Layout.spacing.lg,
  },
  
  section: {
    marginBottom: Layout.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },
  
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    marginBottom: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  
  filterRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.sm,
  },
  
  filterRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.sm,
  },
  
  filterLabel: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  
  filterValue: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  
  ageRangeContainer: {
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    marginBottom: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  
  ageRangeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  
  ageInputsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.md,
  },
  
  ageInputWrapper: {
    flex: 1,
  },
  
  ageInputLabel: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  
  ageInput: {
    textAlign: "center",
  },
  
  ageRangeSeparator: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  distanceContainer: {
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    marginBottom: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  
  distanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  
  distanceValue: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[500],
    fontWeight: Layout.typography.fontWeight.semibold,
    marginLeft: "auto",
  },
  
  distanceSliderContainer: {
    paddingHorizontal: Layout.spacing.sm,
  },
  
  distanceButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Layout.spacing.xs,
  },
  
  distanceButton: {
    flex: 1,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.xs,
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  
  selectedDistanceButton: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  
  distanceButtonText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  selectedDistanceButtonText: {
    color: Colors.background.primary,
  },
  
  bottomContainer: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  
  applyButton: {
    width: "100%",
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    maxHeight: "80%",
  },
  
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  modalTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  
  modalOptions: {
    maxHeight: 400,
  },
  
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  selectedModalOption: {
    backgroundColor: Colors.primary[50],
  },
  
  modalOptionText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
  },
  
  selectedModalOptionText: {
    color: Colors.primary[500],
    fontWeight: Layout.typography.fontWeight.medium,
  },
});