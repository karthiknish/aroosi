import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Card, Avatar } from "../components/ui";
import { Colors, Layout } from "../constants";
import { useApiClient } from "../utils/api";
import { Profile } from "../types";
import { ValidationRules, calculateAge } from "../utils/validation";
import { usePhotoManagement } from "../hooks/usePhotoManagement";
import PhotoGallery from "../components/photos/PhotoGallery";
import PlatformHaptics from "../utils/PlatformHaptics";

interface EditSection {
  id: string;
  title: string;
  icon: string;
  fields: string[];
  completed: boolean;
}

export default function ProfileEditScreen() {
  const apiClient = useApiClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Photo management
  const { 
    images, 
    uploading, 
    deleting, 
    addPhoto, 
    deletePhoto, 
    setMainPhoto 
  } = usePhotoManagement();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProfile();
      if (response.success && response.data?.profile) {
        setProfile(response.data.profile);
        setFormData(response.data.profile);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const sections: EditSection[] = [
    {
      id: "basic",
      title: "Basic Information",
      icon: "person-outline",
      fields: ["fullName", "dateOfBirth", "gender"],
      completed: !!(formData.fullName && formData.dateOfBirth && formData.gender),
    },
    {
      id: "location",
      title: "Location",
      icon: "location-outline",
      fields: ["ukCity", "ukPostcode"],
      completed: !!formData.ukCity,
    },
    {
      id: "about",
      title: "About Me",
      icon: "document-text-outline",
      fields: ["aboutMe"],
      completed: !!(formData.aboutMe && formData.aboutMe.length >= 50),
    },
    {
      id: "details",
      title: "Personal Details",
      icon: "school-outline",
      fields: ["occupation", "education", "height", "maritalStatus"],
      completed: !!(formData.occupation && formData.education && formData.height && formData.maritalStatus),
    },
    {
      id: "cultural",
      title: "Cultural & Religious",
      icon: "heart-outline",
      fields: ["religion", "sect", "lifestyle", "smoking", "drinking"],
      completed: !!formData.religion,
    },
    {
      id: "photos",
      title: "Photos",
      icon: "camera-outline",
      fields: ["profileImageIds"],
      completed: !!(formData.profileImageIds && formData.profileImageIds.length > 0),
    },
  ];

  const validateSection = (sectionId: string): boolean => {
    const newErrors: { [key: string]: string } = {};
    const section = sections.find(s => s.id === sectionId);
    
    if (!section) return true;

    switch (sectionId) {
      case "basic":
        if (!formData.fullName) {
          newErrors.fullName = ValidationRules.fullName.required;
        }
        if (!formData.dateOfBirth) {
          newErrors.dateOfBirth = ValidationRules.dateOfBirth.required;
        } else {
          const validation = ValidationRules.dateOfBirth.validate?.(formData.dateOfBirth);
          if (validation !== true) {
            newErrors.dateOfBirth = validation as string;
          }
        }
        if (!formData.gender) {
          newErrors.gender = "Please select your gender";
        }
        break;
        
      case "location":
        if (!formData.ukCity) {
          newErrors.ukCity = ValidationRules.city.required;
        }
        break;
        
      case "about":
        if (!formData.aboutMe) {
          newErrors.aboutMe = ValidationRules.aboutMe.required;
        } else if (formData.aboutMe.length < 50) {
          newErrors.aboutMe = ValidationRules.aboutMe.minLength.message;
        }
        break;
        
      case "details":
        if (!formData.occupation) {
          newErrors.occupation = ValidationRules.occupation.required;
        }
        if (!formData.education) {
          newErrors.education = ValidationRules.education.required;
        }
        if (!formData.height) {
          newErrors.height = ValidationRules.height.required;
        }
        if (!formData.maritalStatus) {
          newErrors.maritalStatus = ValidationRules.maritalStatus.required;
        }
        break;
        
      case "cultural":
        if (!formData.religion) {
          newErrors.religion = "Please select your religion";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateFormData = (updates: Partial<Profile>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    
    // Clear related errors
    const updatedErrors = { ...errors };
    Object.keys(updates).forEach(key => {
      delete updatedErrors[key];
    });
    setErrors(updatedErrors);
  };

  const saveSection = async (sectionId: string) => {
    if (!validateSection(sectionId)) {
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.updateProfile(formData);
      
      if (response.success) {
        setActiveSection(null);
        await loadProfile();
        Alert.alert("Success", "Section updated successfully");
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving section:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    if (profile) {
      setFormData(profile);
      setErrors({});
      setActiveSection(null);
    }
  };

  const renderSectionHeader = (section: EditSection) => (
    <TouchableOpacity
      key={section.id}
      style={styles.sectionHeader}
      onPress={() => setActiveSection(activeSection === section.id ? null : section.id)}
    >
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionIcon, section.completed && styles.completedSectionIcon]}>
          <Ionicons 
            name={section.icon as any} 
            size={20} 
            color={section.completed ? Colors.success[500] : Colors.primary[500]} 
          />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={[styles.sectionStatus, section.completed && styles.completedSectionStatus]}>
            {section.completed ? "Complete" : "Incomplete"}
          </Text>
        </View>
      </View>
      <View style={styles.sectionHeaderRight}>
        {section.completed && (
          <Ionicons name="checkmark-circle" size={20} color={Colors.success[500]} />
        )}
        <Ionicons 
          name={activeSection === section.id ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={Colors.neutral[400]} 
        />
      </View>
    </TouchableOpacity>
  );

  const renderBasicSection = () => (
    <View style={styles.sectionContent}>
      <Input
        label="Full Name"
        value={formData.fullName || ""}
        onChangeText={(fullName) => updateFormData({ fullName })}
        placeholder="Enter your full name"
        error={errors.fullName}
        required
      />
      
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Date of Birth *</Text>
        <TouchableOpacity style={[styles.inputButton, errors.dateOfBirth && styles.errorInput]}>
          <Text style={[styles.inputButtonText, !formData.dateOfBirth && styles.placeholderText]}>
            {formData.dateOfBirth 
              ? new Date(formData.dateOfBirth).toLocaleDateString('en-GB', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })
              : "Select your date of birth"
            }
          </Text>
          <Ionicons name="calendar-outline" size={20} color={Colors.neutral[400]} />
        </TouchableOpacity>
        {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Gender *</Text>
        <View style={styles.genderContainer}>
          {["male", "female"].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[
                styles.genderOption,
                formData.gender === gender && styles.selectedGenderOption,
              ]}
              onPress={() => updateFormData({ gender: gender as any })}
            >
              <Ionicons 
                name={gender === "male" ? "man" : "woman"} 
                size={24} 
                color={formData.gender === gender ? Colors.background.primary : Colors.primary[500]} 
              />
              <Text
                style={[
                  styles.genderText,
                  formData.gender === gender && styles.selectedGenderText,
                ]}
              >
                {gender.charAt(0).toUpperCase() + gender.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
      </View>
    </View>
  );

  const renderLocationSection = () => (
    <View style={styles.sectionContent}>
      <Input
        label="City"
        value={formData.ukCity || ""}
        onChangeText={(ukCity) => updateFormData({ ukCity })}
        placeholder="e.g., London, Manchester"
        error={errors.ukCity}
        required
      />
      
      <Input
        label="Postcode (Optional)"
        value={formData.ukPostcode || ""}
        onChangeText={(ukPostcode) => updateFormData({ ukPostcode: ukPostcode.toUpperCase() })}
        placeholder="e.g., SW1A 1AA"
        autoCapitalize="characters"
      />
    </View>
  );

  const renderAboutSection = () => {
    const characterCount = (formData.aboutMe || "").length;
    
    return (
      <View style={styles.sectionContent}>
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>About Me *</Text>
          <View style={[styles.textAreaContainer, errors.aboutMe && styles.errorInput]}>
            <TextInput
              style={styles.textArea}
              value={formData.aboutMe || ""}
              onChangeText={(aboutMe) => updateFormData({ aboutMe })}
              placeholder="Tell people about yourself, your interests, and what you're looking for..."
              placeholderTextColor={Colors.neutral[400]}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
          <View style={styles.characterCountContainer}>
            <Text style={[
              styles.characterCount,
              characterCount < 50 && styles.characterCountWarning,
              characterCount >= 50 && characterCount <= 500 && styles.characterCountValid,
            ]}>
              {characterCount}/500 characters {characterCount < 50 && "(minimum 50)"}
            </Text>
          </View>
          {errors.aboutMe && <Text style={styles.errorText}>{errors.aboutMe}</Text>}
        </View>
      </View>
    );
  };

  const renderDetailsSection = () => (
    <View style={styles.sectionContent}>
      <Input
        label="Occupation"
        value={formData.occupation || ""}
        onChangeText={(occupation) => updateFormData({ occupation })}
        placeholder="e.g., Software Engineer, Teacher"
        error={errors.occupation}
        required
      />
      
      <Input
        label="Education"
        value={formData.education || ""}
        onChangeText={(education) => updateFormData({ education })}
        placeholder="Select your education level"
        error={errors.education}
        required
      />
      
      <Input
        label="Height"
        value={formData.height || ""}
        onChangeText={(height) => updateFormData({ height })}
        placeholder="e.g., 5'8\" (173cm)"
        error={errors.height}
        required
      />
      
      <Input
        label="Marital Status"
        value={formData.maritalStatus || ""}
        onChangeText={(maritalStatus) => updateFormData({ maritalStatus: maritalStatus as any })}
        placeholder="Select your marital status"
        error={errors.maritalStatus}
        required
      />
    </View>
  );

  const renderCulturalSection = () => (
    <View style={styles.sectionContent}>
      <Input
        label="Religion"
        value={formData.religion || ""}
        onChangeText={(religion) => updateFormData({ religion })}
        placeholder="Select your religion"
        error={errors.religion}
        required
      />
      
      {formData.religion === "islam" && (
        <Input
          label="Sect (Optional)"
          value={formData.sect || ""}
          onChangeText={(sect) => updateFormData({ sect })}
          placeholder="Select sect"
        />
      )}
      
      <Input
        label="Lifestyle (Optional)"
        value={formData.lifestyle || ""}
        onChangeText={(lifestyle) => updateFormData({ lifestyle })}
        placeholder="Select lifestyle"
      />

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Smoking</Text>
        <View style={styles.optionsRowContainer}>
          {["no", "occasionally", "yes"].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionChip,
                formData.smoking === option && styles.selectedOptionChip,
              ]}
              onPress={() => updateFormData({ smoking: option as any })}
            >
              <Text
                style={[
                  styles.optionChipText,
                  formData.smoking === option && styles.selectedOptionChipText,
                ]}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Drinking</Text>
        <View style={styles.optionsRowContainer}>
          {["no", "occasionally", "yes"].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionChip,
                formData.drinking === option && styles.selectedOptionChip,
              ]}
              onPress={() => updateFormData({ drinking: option as any })}
            >
              <Text
                style={[
                  styles.optionChipText,
                  formData.drinking === option && styles.selectedOptionChipText,
                ]}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderPhotosSection = () => {
    const handleAddPhoto = async () => {
      const success = await addPhoto();
      if (success) {
        await PlatformHaptics.success();
      }
    };

    const handleDeletePhoto = async (imageId: string) => {
      const success = await deletePhoto(imageId);
      if (success) {
        await PlatformHaptics.success();
      }
    };

    const handleSetMainPhoto = async (imageId: string) => {
      const success = await setMainPhoto(imageId);
      if (success) {
        await PlatformHaptics.success();
      }
    };

    return (
      <View style={styles.sectionContent}>
        <Text style={styles.photosTitle}>Profile Photos</Text>
        <Text style={styles.photosSubtitle}>Add up to 6 photos to showcase your personality</Text>
        
        <PhotoGallery
          images={images}
          onAddPhoto={handleAddPhoto}
          onDeletePhoto={handleDeletePhoto}
          onSetMainPhoto={handleSetMainPhoto}
          uploading={uploading}
          deleting={deleting}
          canAddMore={true}
          maxPhotos={6}
          editable={true}
          showAddButton={true}
        />
      </View>
    );
  };

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case "basic": return renderBasicSection();
      case "location": return renderLocationSection();
      case "about": return renderAboutSection();
      case "details": return renderDetailsSection();
      case "cultural": return renderCulturalSection();
      case "photos": return renderPhotosSection();
      default: return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <Button title="Retry" onPress={loadProfile} />
        </View>
      </SafeAreaView>
    );
  }

  const completedSections = sections.filter(s => s.completed).length;
  const progressPercentage = (completedSections / sections.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Progress Overview */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>Profile Completion</Text>
              <Text style={styles.progressSubtitle}>
                {completedSections} of {sections.length} sections complete
              </Text>
            </View>
            <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progressPercentage}%` }
                ]} 
              />
            </View>
          </View>
        </Card>

        {/* Sections */}
        {sections.map((section) => (
          <Card key={section.id} style={styles.sectionCard}>
            {renderSectionHeader(section)}
            
            {activeSection === section.id && (
              <>
                {renderSectionContent(section.id)}
                
                {/* Section Actions */}
                <View style={styles.sectionActions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={discardChanges}
                    style={styles.cancelButton}
                  />
                  <Button
                    title="Save Changes"
                    onPress={() => saveSection(section.id)}
                    loading={saving}
                    style={styles.saveButton}
                  />
                </View>
              </>
            )}
          </Card>
        ))}

        {/* Quick Actions */}
        <Card style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push("/profile-viewers")}
          >
            <Ionicons name="eye-outline" size={20} color={Colors.primary[500]} />
            <Text style={styles.quickActionText}>View Profile Visitors</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.neutral[400]} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push("/premium-settings")}
          >
            <Ionicons name="diamond-outline" size={20} color={Colors.primary[500]} />
            <Text style={styles.quickActionText}>Premium Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.neutral[400]} />
          </TouchableOpacity>
        </Card>
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
    padding: Layout.spacing.lg,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Layout.spacing.lg,
  },
  
  // Progress Card
  progressCard: {
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Layout.spacing.md,
  },
  
  progressInfo: {
    flex: 1,
  },
  
  progressTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  
  progressSubtitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  
  progressPercentage: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.primary[500],
  },
  
  progressBarContainer: {
    width: "100%",
  },
  
  progressBar: {
    height: 8,
    backgroundColor: Colors.neutral[200],
    borderRadius: Layout.radius.full,
    overflow: "hidden",
  },
  
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary[500],
    borderRadius: Layout.radius.full,
  },
  
  // Section Card
  sectionCard: {
    marginBottom: Layout.spacing.md,
    overflow: "hidden",
  },
  
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
    marginRight: Layout.spacing.md,
  },
  
  completedSectionIcon: {
    backgroundColor: Colors.success[100],
  },
  
  sectionHeaderText: {
    flex: 1,
  },
  
  sectionTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  
  sectionStatus: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.warning[500],
  },
  
  completedSectionStatus: {
    color: Colors.success[500],
  },
  
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.sm,
  },
  
  // Section Content
  sectionContent: {
    padding: Layout.spacing.lg,
    gap: Layout.spacing.lg,
  },
  
  fieldContainer: {
    gap: Layout.spacing.sm,
  },
  
  fieldLabel: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  
  inputButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.primary,
  },
  
  inputButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
  },
  
  placeholderText: {
    color: Colors.neutral[400],
  },
  
  errorInput: {
    borderColor: Colors.error[500],
  },
  
  errorText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.error[500],
  },
  
  // Gender Options
  genderContainer: {
    flexDirection: "row",
    gap: Layout.spacing.md,
  },
  
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.lg,
    backgroundColor: Colors.background.primary,
    gap: Layout.spacing.sm,
  },
  
  selectedGenderOption: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  
  genderText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  selectedGenderText: {
    color: Colors.background.primary,
  },
  
  // Text Area
  textAreaContainer: {
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.primary,
  },
  
  textArea: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    minHeight: 120,
    maxHeight: 200,
  },
  
  characterCountContainer: {
    paddingHorizontal: Layout.spacing.md,
    paddingBottom: Layout.spacing.sm,
  },
  
  characterCount: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.neutral[400],
    textAlign: "right",
  },
  
  characterCountWarning: {
    color: Colors.warning[500],
  },
  
  characterCountValid: {
    color: Colors.success[500],
  },
  
  // Option Chips
  optionsRowContainer: {
    flexDirection: "row",
    gap: Layout.spacing.sm,
  },
  
  optionChip: {
    flex: 1,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.background.primary,
    alignItems: "center",
  },
  
  selectedOptionChip: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  
  optionChipText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.primary,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  selectedOptionChipText: {
    color: Colors.background.primary,
  },
  
  // Photos
  photosTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  
  photosSubtitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.lg,
  },
  
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Layout.spacing.sm,
    justifyContent: "space-between",
  },
  
  photoSlot: {
    width: "31%",
    aspectRatio: 3/4,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.neutral[300],
    borderRadius: Layout.radius.md,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.neutral[50],
    gap: Layout.spacing.xs,
  },
  
  photoSlotText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.neutral[500],
    textAlign: "center",
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  // Section Actions
  sectionActions: {
    flexDirection: "row",
    gap: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.lg,
  },
  
  cancelButton: {
    flex: 1,
  },
  
  saveButton: {
    flex: 2,
  },
  
  // Quick Actions
  quickActionsCard: {
    padding: Layout.spacing.lg,
    marginTop: Layout.spacing.lg,
  },
  
  quickActionsTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },
  
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  quickActionText: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    marginLeft: Layout.spacing.md,
  },
});