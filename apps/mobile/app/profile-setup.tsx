import React, { useState, useEffect } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Card } from "../components/ui";
import { Colors, Layout } from "../constants";
import { useApiClient } from "../utils/api";
import { ValidationRules, validateImageFile } from "../utils/validation";
import { Profile } from "../types";

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

  const totalSteps = 5;

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

      case 4: // Photos
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
  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Basic Information</Text>
        <Text style={styles.stepSubtitle}>
          Tell us a bit about yourself
        </Text>
      </View>

      <Input
        label="Full Name"
        value={data.fullName || ""}
        onChangeText={(fullName) => onUpdate({ fullName })}
        placeholder="Enter your full name"
        error={errors.fullName}
        required
      />

      <Input
        label="Date of Birth"
        value={data.dateOfBirth || ""}
        onChangeText={(dateOfBirth) => onUpdate({ dateOfBirth })}
        placeholder="YYYY-MM-DD"
        error={errors.dateOfBirth}
        required
      />

      {/* Gender Selection */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Gender *</Text>
        <View style={styles.optionsContainer}>
          {[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "other", label: "Other" },
          ].map((option) => (
            <Button
              key={option.value}
              title={option.label}
              variant={data.gender === option.value ? "primary" : "outline"}
              onPress={() => onUpdate({ gender: option.value as any })}
              style={styles.optionButton}
            />
          ))}
        </View>
        {errors.gender && (
          <Text style={styles.errorText}>{errors.gender}</Text>
        )}
      </View>

      <Button title="Continue" onPress={onNext} fullWidth />
    </Card>
  );
}

function LocationStep({ data, onUpdate, onNext, onPrev, errors }: StepComponentProps) {
  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Location</Text>
        <Text style={styles.stepSubtitle}>
          Where are you based?
        </Text>
      </View>

      <Input
        label="City"
        value={data.ukCity || ""}
        onChangeText={(ukCity) => onUpdate({ ukCity })}
        placeholder="e.g., London, Manchester"
        error={errors.ukCity}
        required
      />

      <Input
        label="Postcode (Optional)"
        value={data.ukPostcode || ""}
        onChangeText={(ukPostcode) => onUpdate({ ukPostcode })}
        placeholder="e.g., SW1A 1AA"
        autoCapitalize="characters"
      />

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
        />
      </View>
    </Card>
  );
}

function AboutMeStep({ data, onUpdate, onNext, onPrev, errors }: StepComponentProps) {
  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>About You</Text>
        <Text style={styles.stepSubtitle}>
          Write something that represents you
        </Text>
      </View>

      <Input
        label="About Me"
        value={data.aboutMe || ""}
        onChangeText={(aboutMe) => onUpdate({ aboutMe })}
        placeholder="Tell people what makes you unique..."
        multiline
        numberOfLines={6}
        error={errors.aboutMe}
        hint={`${(data.aboutMe || "").length}/500 characters (min 50)`}
        required
      />

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
        />
      </View>
    </Card>
  );
}

function DetailsStep({ data, onUpdate, onNext, onPrev, errors }: StepComponentProps) {
  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>More Details</Text>
        <Text style={styles.stepSubtitle}>
          Help others get to know you better
        </Text>
      </View>

      <Input
        label="Occupation"
        value={data.occupation || ""}
        onChangeText={(occupation) => onUpdate({ occupation })}
        placeholder="What do you do for work?"
        error={errors.occupation}
        required
      />

      {/* Education Dropdown */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Education *</Text>
        <View style={styles.optionsContainer}>
          {[
            { value: "high_school", label: "High School" },
            { value: "some_college", label: "Some College" },
            { value: "bachelors", label: "Bachelor's" },
            { value: "masters", label: "Master's" },
            { value: "phd", label: "PhD" },
          ].map((option) => (
            <Button
              key={option.value}
              title={option.label}
              variant={data.education === option.value ? "primary" : "outline"}
              onPress={() => onUpdate({ education: option.value })}
              style={styles.smallOptionButton}
              size="sm"
            />
          ))}
        </View>
        {errors.education && (
          <Text style={styles.errorText}>{errors.education}</Text>
        )}
      </View>

      <Input
        label="Height"
        value={data.height || ""}
        onChangeText={(height) => onUpdate({ height })}
        placeholder="e.g., 5'8&quot; or 173cm"
        error={errors.height}
        required
      />

      {/* Marital Status */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Marital Status *</Text>
        <View style={styles.optionsContainer}>
          {[
            { value: "single", label: "Single" },
            { value: "divorced", label: "Divorced" },
            { value: "widowed", label: "Widowed" },
          ].map((option) => (
            <Button
              key={option.value}
              title={option.label}
              variant={data.maritalStatus === option.value ? "primary" : "outline"}
              onPress={() => onUpdate({ maritalStatus: option.value as any })}
              style={styles.smallOptionButton}
              size="sm"
            />
          ))}
        </View>
        {errors.maritalStatus && (
          <Text style={styles.errorText}>{errors.maritalStatus}</Text>
        )}
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
        />
      </View>
    </Card>
  );
}

function PhotosStep({ data, onUpdate, onNext, onPrev, isLoading, errors }: StepComponentProps) {
  const handleAddPhoto = () => {
    // TODO: Implement photo picker
    Alert.alert("Photo Upload", "Photo upload functionality will be implemented with image picker.");
  };

  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Add Your Photos</Text>
        <Text style={styles.stepSubtitle}>
          Add at least one photo to complete your profile
        </Text>
      </View>

      <View style={styles.photoContainer}>
        <Button
          title="Add Photo"
          variant="outline"
          icon={<Ionicons name="camera" size={20} color={Colors.primary[500]} />}
          onPress={handleAddPhoto}
          style={styles.addPhotoButton}
        />
        
        {errors.photos && (
          <Text style={styles.errorText}>{errors.photos}</Text>
        )}
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
          title="Complete Profile"
          onPress={onNext}
          loading={isLoading}
          disabled={isLoading}
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
});