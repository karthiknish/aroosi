import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
// @ts-expect-error expo datetime picker
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Card } from "../components/ui";
import { Colors, Layout } from "../constants";
import { useApiClient } from "../utils/api";
import { ValidationRules, validateImageFile } from "../utils/validation";
import { Profile } from "../types";
import { useProfileSetupPhotos } from "../hooks/usePhotoManagement";
import PhotoGallery from "../components/photos/PhotoGallery";
import PlatformHaptics from "../utils/PlatformHaptics";

interface StepProps {
  data: Partial<Profile>;
  onUpdate: (updates: Partial<Profile>) => void;
  onNext: () => void;
  onPrev?: () => void;
  isLoading?: boolean;
}

export default function ProfileSetupScreen() {
  const { step: paramStep } = useLocalSearchParams<{ step?: string }>();
  const apiClient = useApiClient();
  
  const [currentStep, setCurrentStep] = useState(parseInt(paramStep || "0"));
  const [profileData, setProfileData] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const totalSteps = 6;

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.data?.profile) {
        setProfileData(response.data.profile);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const updateProfileData = (updates: Partial<Profile>) => {
    setProfileData(prev => ({ ...prev, ...updates }));
    // Clear related errors
    const updatedErrors = { ...errors };
    Object.keys(updates).forEach(key => {
      delete updatedErrors[key];
    });
    setErrors(updatedErrors);
  };

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    switch (stepIndex) {
      case 0: // Basic Info
        if (!profileData.fullName) {
          newErrors.fullName = ValidationRules.fullName.required;
        }
        if (!profileData.dateOfBirth) {
          newErrors.dateOfBirth = ValidationRules.dateOfBirth.required;
        } else {
          const validation = ValidationRules.dateOfBirth.validate?.(profileData.dateOfBirth);
          if (validation !== true) {
            newErrors.dateOfBirth = validation as string;
          }
        }
        if (!profileData.gender) {
          newErrors.gender = "Please select your gender";
        }
        break;

      case 1: // Location
        if (!profileData.ukCity) {
          newErrors.ukCity = ValidationRules.city.required;
        }
        break;

      case 2: // About Me
        if (!profileData.aboutMe) {
          newErrors.aboutMe = ValidationRules.aboutMe.required;
        } else if (profileData.aboutMe.length < 50) {
          newErrors.aboutMe = ValidationRules.aboutMe.minLength.message;
        }
        break;

      case 3: // Details
        if (!profileData.occupation) {
          newErrors.occupation = ValidationRules.occupation.required;
        }
        if (!profileData.education) {
          newErrors.education = ValidationRules.education.required;
        }
        if (!profileData.height) {
          newErrors.height = ValidationRules.height.required;
        }
        if (!profileData.maritalStatus) {
          newErrors.maritalStatus = ValidationRules.maritalStatus.required;
        }
        break;

      case 4: // Cultural/Religious
        if (!profileData.religion) {
          newErrors.religion = "Please select your religion";
        }
        break;

      case 5: // Photos
        if (!profileData.profileImageIds || profileData.profileImageIds.length === 0) {
          newErrors.photos = "Please add at least one photo";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const completeProfile = {
        ...profileData,
        isProfileComplete: true,
      };

      const response = await apiClient.createProfile(completeProfile);
      if (response.success) {
        Alert.alert(
          "Profile Created!",
          "Your profile is ready. Start discovering matches!",
          [
            {
              text: "Start Exploring",
              onPress: () => router.replace("/(tabs)/search"),
            },
          ]
        );
      } else {
        Alert.alert("Error", response.error || "Failed to create profile");
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      Alert.alert("Error", "Failed to create profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentStep + 1) / totalSteps) * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {currentStep + 1} of {totalSteps}
      </Text>
    </View>
  );

  const stepProps: StepProps = {
    data: profileData,
    onUpdate: updateProfileData,
    onNext: handleNext,
    onPrev: currentStep > 0 ? handlePrev : undefined,
    isLoading: loading,
  };

  const steps = [
    <BasicInfoStep key="basic" {...stepProps} errors={errors} />,
    <LocationStep key="location" {...stepProps} errors={errors} />,
    <AboutMeStep key="about" {...stepProps} errors={errors} />,
    <DetailsStep key="details" {...stepProps} errors={errors} />,
    <CulturalStep key="cultural" {...stepProps} errors={errors} />,
    <PhotosStep key="photos" {...stepProps} errors={errors} />,
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {renderProgressBar()}
        
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {steps[currentStep]}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Step Components
interface StepComponentProps extends StepProps {
  errors: { [key: string]: string };
}

function BasicInfoStep({ data, onUpdate, onNext, errors }: StepComponentProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(data.dateOfBirth ? new Date(data.dateOfBirth) : new Date());

  const handleDateChange = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    onUpdate({ dateOfBirth: formattedDate });
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="person-outline" size={32} color={Colors.primary[500]} />
        </View>
        <Text style={styles.stepTitle}>Basic Information</Text>
        <Text style={styles.stepSubtitle}>
          Tell us a bit about yourself
        </Text>
      </View>

      <View style={styles.formContainer}>
        <Input
          label="Full Name"
          value={data.fullName || ""}
          onChangeText={(fullName) => onUpdate({ fullName })}
          placeholder="Enter your full name"
          error={errors.fullName}
          required
          style={styles.inputField}
        />

        {/* Date of Birth with DatePicker */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Date of Birth *</Text>
          <TouchableOpacity 
            style={[styles.datePickerButton, errors.dateOfBirth && styles.errorInput]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.datePickerText, !data.dateOfBirth && styles.placeholderText]}>
              {data.dateOfBirth ? formatDateDisplay(data.dateOfBirth) : "Select your date of birth"}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={Colors.neutral[400]} />
          </TouchableOpacity>
          {errors.dateOfBirth && (
            <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
          )}
        </View>

        {/* Profile For */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>This Profile Is For *</Text>
          <View style={styles.optionsContainer}>
            {[
              { value: "self", label: "Myself", icon: "person" },
              { value: "family", label: "Family Member", icon: "people" },
              { value: "friend", label: "Friend", icon: "heart" },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.profileForOption,
                  data.profileFor === option.value && styles.selectedProfileForOption,
                ]}
                onPress={() => onUpdate({ profileFor: option.value as any })}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={20} 
                  color={data.profileFor === option.value ? Colors.background.primary : Colors.primary[500]} 
                />
                <Text
                  style={[
                    styles.profileForText,
                    data.profileFor === option.value && styles.selectedProfileForText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Gender Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Gender *</Text>
          <View style={styles.optionsContainer}>
            {[
              { value: "male", label: "Male", icon: "man" },
              { value: "female", label: "Female", icon: "woman" },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderOption,
                  data.gender === option.value && styles.selectedGenderOption,
                ]}
                onPress={() => onUpdate({ gender: option.value as any })}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={24} 
                  color={data.gender === option.value ? Colors.background.primary : Colors.primary[500]} 
                />
                <Text
                  style={[
                    styles.genderText,
                    data.gender === option.value && styles.selectedGenderText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.gender && (
            <Text style={styles.errorText}>{errors.gender}</Text>
          )}
        </View>
      </View>

      <Button 
        title="Continue" 
        onPress={onNext} 
        style={styles.continueButton}
        disabled={!data.fullName || !data.dateOfBirth || !data.gender || !data.profileFor}
      />

      {/* Date Picker Modal */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide">
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDateChange(selectedDate)}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="wheel"
                onChange={(event, date) => {
                  if (date) setSelectedDate(date);
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1924, 0, 1)}
              />
            </View>
          </View>
        </Modal>
      )}
    </Card>
  );
}

function LocationStep({ data, onUpdate, onNext, onPrev, errors }: StepComponentProps) {
  const [showCityModal, setShowCityModal] = useState(false);
  
  const ukCities = [
    "London", "Birmingham", "Manchester", "Leeds", "Glasgow", "Liverpool",
    "Newcastle", "Sheffield", "Bristol", "Leicester", "Edinburgh", "Nottingham",
    "Southampton", "Cardiff", "Coventry", "Bradford", "Belfast", "Other"
  ];

  const handleCitySelect = (city: string) => {
    onUpdate({ ukCity: city });
    setShowCityModal(false);
  };

  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="location-outline" size={32} color={Colors.primary[500]} />
        </View>
        <Text style={styles.stepTitle}>Location</Text>
        <Text style={styles.stepSubtitle}>
          Where are you based in the UK?
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* City Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>City *</Text>
          <TouchableOpacity 
            style={[styles.selectButton, errors.ukCity && styles.errorInput]}
            onPress={() => setShowCityModal(true)}
          >
            <Text style={[styles.selectButtonText, !data.ukCity && styles.placeholderText]}>
              {data.ukCity || "Select your city"}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.neutral[400]} />
          </TouchableOpacity>
          {errors.ukCity && (
            <Text style={styles.errorText}>{errors.ukCity}</Text>
          )}
        </View>

        <Input
          label="Postcode (Optional)"
          value={data.ukPostcode || ""}
          onChangeText={(ukPostcode) => onUpdate({ ukPostcode: ukPostcode.toUpperCase() })}
          placeholder="e.g., SW1A 1AA"
          autoCapitalize="characters"
          style={styles.inputField}
        />
      </View>

      <View style={styles.buttonContainer}>
        {onPrev && (
          <Button
            title="Back"
            variant="outline"
            onPress={onPrev}
            style={styles.backButton}
          />
        )}
        <Button
          title="Continue"
          onPress={onNext}
          style={styles.nextButton}
          disabled={!data.ukCity}
        />
      </View>

      {/* City Selection Modal */}
      <Modal visible={showCityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalOptions}>
              {ukCities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.modalOption,
                    data.ukCity === city && styles.selectedModalOption,
                  ]}
                  onPress={() => handleCitySelect(city)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      data.ukCity === city && styles.selectedModalOptionText,
                    ]}
                  >
                    {city}
                  </Text>
                  {data.ukCity === city && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary[500]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

function AboutMeStep({ data, onUpdate, onNext, onPrev, errors }: StepComponentProps) {
  const characterCount = (data.aboutMe || "").length;
  const isValidLength = characterCount >= 50 && characterCount <= 500;

  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="document-text-outline" size={32} color={Colors.primary[500]} />
        </View>
        <Text style={styles.stepTitle}>About You</Text>
        <Text style={styles.stepSubtitle}>
          Write something that represents who you are and what you're looking for
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>About Me *</Text>
          <View style={[styles.textAreaContainer, errors.aboutMe && styles.errorInput]}>
            <TextInput
              style={styles.textArea}
              value={data.aboutMe || ""}
              onChangeText={(aboutMe) => onUpdate({ aboutMe })}
              placeholder="Tell people about your personality, interests, goals, and what you're looking for in a partner..."
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
              characterCount > 500 && styles.characterCountError,
            ]}>
              {characterCount}/500 characters {characterCount < 50 && "(minimum 50)"}
            </Text>
          </View>
          {errors.aboutMe && (
            <Text style={styles.errorText}>{errors.aboutMe}</Text>
          )}
        </View>

        {/* Sample prompts */}
        <View style={styles.promptsContainer}>
          <Text style={styles.promptsTitle}>Need inspiration? Try including:</Text>
          <View style={styles.promptsList}>
            <Text style={styles.promptItem}>• Your hobbies and interests</Text>
            <Text style={styles.promptItem}>• Your career and goals</Text>
            <Text style={styles.promptItem}>• What makes you laugh</Text>
            <Text style={styles.promptItem}>• What you value most in life</Text>
            <Text style={styles.promptItem}>• What you're looking for in a partner</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {onPrev && (
          <Button
            title="Back"
            variant="outline"
            onPress={onPrev}
            style={styles.backButton}
          />
        )}
        <Button
          title="Continue"
          onPress={onNext}
          style={styles.nextButton}
          disabled={!isValidLength}
        />
      </View>
    </Card>
  );
}

function DetailsStep({ data, onUpdate, onNext, onPrev, errors }: StepComponentProps) {
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showMaritalModal, setShowMaritalModal] = useState(false);

  const educationOptions = [
    { value: "high_school", label: "High School / Secondary Education" },
    { value: "college", label: "College / A-Levels" },
    { value: "bachelors", label: "Bachelor's Degree" },
    { value: "masters", label: "Master's Degree" },
    { value: "phd", label: "PhD / Doctorate" },
    { value: "professional", label: "Professional Qualification" },
    { value: "other", label: "Other" },
  ];

  const maritalOptions = [
    { value: "single", label: "Never Married" },
    { value: "divorced", label: "Divorced" },
    { value: "widowed", label: "Widowed" },
    { value: "annulled", label: "Annulled" },
  ];

  const getEducationLabel = (value: string) => {
    return educationOptions.find(opt => opt.value === value)?.label || value;
  };

  const getMaritalLabel = (value: string) => {
    return maritalOptions.find(opt => opt.value === value)?.label || value;
  };

  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="school-outline" size={32} color={Colors.primary[500]} />
        </View>
        <Text style={styles.stepTitle}>Personal Details</Text>
        <Text style={styles.stepSubtitle}>
          Help others get to know you better
        </Text>
      </View>

      <View style={styles.formContainer}>
        <Input
          label="Occupation"
          value={data.occupation || ""}
          onChangeText={(occupation) => onUpdate({ occupation })}
          placeholder="e.g., Software Engineer, Teacher, Doctor"
          error={errors.occupation}
          required
          style={styles.inputField}
        />

        {/* Education Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Education *</Text>
          <TouchableOpacity 
            style={[styles.selectButton, errors.education && styles.errorInput]}
            onPress={() => setShowEducationModal(true)}
          >
            <Text style={[styles.selectButtonText, !data.education && styles.placeholderText]}>
              {data.education ? getEducationLabel(data.education) : "Select your education level"}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.neutral[400]} />
          </TouchableOpacity>
          {errors.education && (
            <Text style={styles.errorText}>{errors.education}</Text>
          )}
        </View>

        <Input
          label="Height"
          value={data.height || ""}
          onChangeText={(height) => onUpdate({ height })}
          placeholder="e.g., 5'8\" (173cm)"
          error={errors.height}
          required
          style={styles.inputField}
        />

        {/* Marital Status Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Marital Status *</Text>
          <TouchableOpacity 
            style={[styles.selectButton, errors.maritalStatus && styles.errorInput]}
            onPress={() => setShowMaritalModal(true)}
          >
            <Text style={[styles.selectButtonText, !data.maritalStatus && styles.placeholderText]}>
              {data.maritalStatus ? getMaritalLabel(data.maritalStatus) : "Select your marital status"}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.neutral[400]} />
          </TouchableOpacity>
          {errors.maritalStatus && (
            <Text style={styles.errorText}>{errors.maritalStatus}</Text>
          )}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {onPrev && (
          <Button
            title="Back"
            variant="outline"
            onPress={onPrev}
            style={styles.backButton}
          />
        )}
        <Button
          title="Continue"
          onPress={onNext}
          style={styles.nextButton}
          disabled={!data.occupation || !data.education || !data.height || !data.maritalStatus}
        />
      </View>

      {/* Education Modal */}
      <Modal visible={showEducationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Education Level</Text>
              <TouchableOpacity onPress={() => setShowEducationModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalOptions}>
              {educationOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    data.education === option.value && styles.selectedModalOption,
                  ]}
                  onPress={() => {
                    onUpdate({ education: option.value });
                    setShowEducationModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      data.education === option.value && styles.selectedModalOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {data.education === option.value && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary[500]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Marital Status Modal */}
      <Modal visible={showMaritalModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Marital Status</Text>
              <TouchableOpacity onPress={() => setShowMaritalModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalOptions}>
              {maritalOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    data.maritalStatus === option.value && styles.selectedModalOption,
                  ]}
                  onPress={() => {
                    onUpdate({ maritalStatus: option.value as any });
                    setShowMaritalModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      data.maritalStatus === option.value && styles.selectedModalOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {data.maritalStatus === option.value && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary[500]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

function CulturalStep({ data, onUpdate, onNext, onPrev, errors }: StepComponentProps) {
  const [showReligionModal, setShowReligionModal] = useState(false);
  const [showSectModal, setShowSectModal] = useState(false);
  const [showLifestyleModal, setShowLifestyleModal] = useState(false);

  const religionOptions = [
    { value: "islam", label: "Islam" },
    { value: "christianity", label: "Christianity" },
    { value: "hinduism", label: "Hinduism" },
    { value: "sikhism", label: "Sikhism" },
    { value: "judaism", label: "Judaism" },
    { value: "buddhism", label: "Buddhism" },
    { value: "other", label: "Other" },
    { value: "non_religious", label: "Non-Religious" },
  ];

  const sectOptions = [
    { value: "sunni", label: "Sunni" },
    { value: "shia", label: "Shia" },
    { value: "other", label: "Other" },
    { value: "prefer_not_to_say", label: "Prefer not to say" },
  ];

  const lifestyleOptions = [
    { value: "religious", label: "Religious" },
    { value: "moderate", label: "Moderate" },
    { value: "liberal", label: "Liberal" },
    { value: "spiritual", label: "Spiritual" },
  ];

  const smokingOptions = [
    { value: "no", label: "No" },
    { value: "occasionally", label: "Occasionally" },
    { value: "yes", label: "Yes" },
  ];

  const drinkingOptions = [
    { value: "no", label: "No" },
    { value: "occasionally", label: "Occasionally" },
    { value: "yes", label: "Yes" },
  ];

  const getReligionLabel = (value: string) => religionOptions.find(opt => opt.value === value)?.label || value;
  const getSectLabel = (value: string) => sectOptions.find(opt => opt.value === value)?.label || value;
  const getLifestyleLabel = (value: string) => lifestyleOptions.find(opt => opt.value === value)?.label || value;

  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="heart-outline" size={32} color={Colors.primary[500]} />
        </View>
        <Text style={styles.stepTitle}>Cultural & Religious</Text>
        <Text style={styles.stepSubtitle}>
          Share your cultural background and lifestyle preferences
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* Religion */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Religion *</Text>
          <TouchableOpacity 
            style={[styles.selectButton, errors.religion && styles.errorInput]}
            onPress={() => setShowReligionModal(true)}
          >
            <Text style={[styles.selectButtonText, !data.religion && styles.placeholderText]}>
              {data.religion ? getReligionLabel(data.religion) : "Select your religion"}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.neutral[400]} />
          </TouchableOpacity>
          {errors.religion && (
            <Text style={styles.errorText}>{errors.religion}</Text>
          )}
        </View>

        {/* Sect (only show if Islam is selected) */}
        {data.religion === "islam" && (
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Sect (Optional)</Text>
            <TouchableOpacity 
              style={styles.selectButton}
              onPress={() => setShowSectModal(true)}
            >
              <Text style={[styles.selectButtonText, !data.sect && styles.placeholderText]}>
                {data.sect ? getSectLabel(data.sect) : "Select sect"}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.neutral[400]} />
            </TouchableOpacity>
          </View>
        )}

        {/* Lifestyle */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Lifestyle (Optional)</Text>
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowLifestyleModal(true)}
          >
            <Text style={[styles.selectButtonText, !data.lifestyle && styles.placeholderText]}>
              {data.lifestyle ? getLifestyleLabel(data.lifestyle) : "Select lifestyle"}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.neutral[400]} />
          </TouchableOpacity>
        </View>

        {/* Smoking */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Smoking</Text>
          <View style={styles.optionsRowContainer}>
            {smokingOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionChip,
                  data.smoking === option.value && styles.selectedOptionChip,
                ]}
                onPress={() => onUpdate({ smoking: option.value as any })}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    data.smoking === option.value && styles.selectedOptionChipText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Drinking */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Drinking</Text>
          <View style={styles.optionsRowContainer}>
            {drinkingOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionChip,
                  data.drinking === option.value && styles.selectedOptionChip,
                ]}
                onPress={() => onUpdate({ drinking: option.value as any })}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    data.drinking === option.value && styles.selectedOptionChipText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {onPrev && (
          <Button
            title="Back"
            variant="outline"
            onPress={onPrev}
            style={styles.backButton}
          />
        )}
        <Button
          title="Continue"
          onPress={onNext}
          style={styles.nextButton}
          disabled={!data.religion}
        />
      </View>

      {/* Religion Modal */}
      <Modal visible={showReligionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Religion</Text>
              <TouchableOpacity onPress={() => setShowReligionModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalOptions}>
              {religionOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    data.religion === option.value && styles.selectedModalOption,
                  ]}
                  onPress={() => {
                    onUpdate({ religion: option.value });
                    setShowReligionModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      data.religion === option.value && styles.selectedModalOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {data.religion === option.value && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary[500]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sect Modal */}
      <Modal visible={showSectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sect</Text>
              <TouchableOpacity onPress={() => setShowSectModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalOptions}>
              {sectOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    data.sect === option.value && styles.selectedModalOption,
                  ]}
                  onPress={() => {
                    onUpdate({ sect: option.value });
                    setShowSectModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      data.sect === option.value && styles.selectedModalOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {data.sect === option.value && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary[500]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Lifestyle Modal */}
      <Modal visible={showLifestyleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Lifestyle</Text>
              <TouchableOpacity onPress={() => setShowLifestyleModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalOptions}>
              {lifestyleOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    data.lifestyle === option.value && styles.selectedModalOption,
                  ]}
                  onPress={() => {
                    onUpdate({ lifestyle: option.value });
                    setShowLifestyleModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      data.lifestyle === option.value && styles.selectedModalOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {data.lifestyle === option.value && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary[500]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

function PhotosStep({ data, onUpdate, onNext, onPrev, isLoading, errors }: StepComponentProps) {
  const { images, uploading, addPhoto, deletePhoto, hasRequiredPhoto } = useProfileSetupPhotos();

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

  const canContinue = hasRequiredPhoto && !uploading;

  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="camera-outline" size={32} color={Colors.primary[500]} />
        </View>
        <Text style={styles.stepTitle}>Add Your Photos</Text>
        <Text style={styles.stepSubtitle}>
          Add at least one photo to complete your profile
        </Text>
      </View>

      <View style={styles.photoContainer}>
        <PhotoGallery
          images={images}
          onAddPhoto={handleAddPhoto}
          onDeletePhoto={handleDeletePhoto}
          uploading={uploading}
          canAddMore={true}
          maxPhotos={6}
          editable={true}
          showAddButton={true}
        />
        
        {errors.photos && (
          <Text style={styles.errorText}>{errors.photos}</Text>
        )}

        {!hasRequiredPhoto && (
          <View style={styles.requirementNotice}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.warning[500]} />
            <Text style={styles.requirementText}>
              At least one photo is required to complete your profile
            </Text>
          </View>
        )}

        <View style={styles.photoTips}>
          <Text style={styles.photoTipsTitle}>Photo Tips:</Text>
          <Text style={styles.photoTip}>• Use recent, clear photos of yourself</Text>
          <Text style={styles.photoTip}>• Smile and look at the camera</Text>
          <Text style={styles.photoTip}>• Include a variety of photos (up to 6)</Text>
          <Text style={styles.photoTip}>• Your first photo will be your main photo</Text>
          <Text style={styles.photoTip}>• Long press photos to set as main or delete</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {onPrev && (
          <Button
            title="Back"
            variant="outline"
            onPress={onPrev}
            style={styles.backButton}
            disabled={uploading}
          />
        )}
        <Button
          title="Complete Profile"
          onPress={onNext}
          loading={isLoading || uploading}
          disabled={!canContinue}
          style={styles.nextButton}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.neutral[200],
    borderRadius: Layout.radius.sm,
    marginRight: Layout.spacing.md,
  },
  
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary[500],
    borderRadius: Layout.radius.sm,
  },
  
  progressText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  scrollContent: {
    padding: Layout.spacing.lg,
  },
  
  stepCard: {
    padding: Layout.spacing.lg,
  },
  
  stepHeader: {
    marginBottom: Layout.spacing.xl,
    alignItems: "center",
  },
  
  stepTitle: {
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  
  stepSubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  
  fieldContainer: {
    marginBottom: Layout.spacing.lg,
  },
  
  fieldLabel: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Layout.spacing.sm,
  },
  
  optionButton: {
    flex: 1,
    minWidth: 0,
  },
  
  smallOptionButton: {
    paddingHorizontal: Layout.spacing.md,
  },
  
  errorText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.error[500],
    marginTop: Layout.spacing.xs,
  },
  
  buttonContainer: {
    flexDirection: "row",
    gap: Layout.spacing.md,
    marginTop: Layout.spacing.xl,
  },
  
  backButton: {
    flex: 1,
  },
  
  nextButton: {
    flex: 2,
  },
  
  photoContainer: {
    alignItems: "center",
    paddingVertical: Layout.spacing.xl,
  },
  
  addPhotoButton: {
    paddingHorizontal: Layout.spacing.xl,
  },
  
  // Enhanced UI Styles
  stepIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Layout.spacing.lg,
  },
  
  formContainer: {
    gap: Layout.spacing.lg,
  },
  
  inputField: {
    marginBottom: Layout.spacing.md,
  },
  
  continueButton: {
    marginTop: Layout.spacing.xl,
  },
  
  // Date Picker Styles
  datePickerButton: {
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
  
  datePickerText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
  },
  
  placeholderText: {
    color: Colors.neutral[400],
  },
  
  datePickerModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  
  datePickerContainer: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
  },
  
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  datePickerCancel: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  
  datePickerDone: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[500],
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  // Profile For Styles
  profileForOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.primary,
    gap: Layout.spacing.sm,
  },
  
  selectedProfileForOption: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  
  profileForText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Layout.typography.fontWeight.medium,
    textAlign: "center",
  },
  
  selectedProfileForText: {
    color: Colors.background.primary,
  },
  
  // Gender Styles
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Layout.spacing.lg,
    paddingHorizontal: Layout.spacing.md,
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
  
  // Select Button Styles
  selectButton: {
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
  
  selectButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
  },
  
  // Text Area Styles
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
  
  characterCountError: {
    color: Colors.error[500],
  },
  
  // Prompts Styles
  promptsContainer: {
    marginTop: Layout.spacing.md,
    padding: Layout.spacing.md,
    backgroundColor: Colors.neutral[50],
    borderRadius: Layout.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
  },
  
  promptsTitle: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  
  promptsList: {
    gap: Layout.spacing.xs,
  },
  
  promptItem: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: Layout.typography.lineHeight.base,
  },
  
  // Option Chip Styles
  optionsRowContainer: {
    flexDirection: "row",
    gap: Layout.spacing.sm,
  },
  
  optionChip: {
    flex: 1,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
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
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  selectedOptionChipText: {
    color: Colors.background.primary,
  },
  
  // Photo Grid Styles
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Layout.spacing.md,
    justifyContent: "space-between",
    marginBottom: Layout.spacing.lg,
  },
  
  photoSlot: {
    width: "48%",
    aspectRatio: 3/4,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.neutral[300],
    borderRadius: Layout.radius.lg,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.neutral[50],
    gap: Layout.spacing.sm,
  },
  
  photoSlotText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.neutral[500],
    textAlign: "center",
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  photoTips: {
    padding: Layout.spacing.md,
    backgroundColor: Colors.primary[50],
    borderRadius: Layout.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
  },
  
  photoTipsTitle: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  
  photoTip: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: Layout.typography.lineHeight.base,
    marginBottom: Layout.spacing.xs,
  },
  
  // Modal Styles
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