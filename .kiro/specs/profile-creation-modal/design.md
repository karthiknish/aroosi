# Profile Creation Modal Design Document

## Overview

The Profile Creation Modal system consists of two integrated components: HeroOnboarding (for initial data collection) and ProfileCreationModal (for comprehensive profile completion). This design ensures seamless data flow, proper validation, and reliable profile submission through a shared context architecture.

## Architecture

### Component Hierarchy

```
HomePage
├── HeroOnboarding (wrapped in ProfileWizardProvider)
│   ├── Step 1: Profile Purpose & Gender
│   ├── Step 2: Name & Date of Birth  
│   ├── Step 3: Phone Number
│   └── ProfileCreationModal (triggered after Step 3)
│       ├── Step 1: Location & Physical Details
│       ├── Step 2: Cultural & Lifestyle
│       ├── Step 3: Education & Career
│       ├── Step 4: Partner Preferences
│       ├── Step 5: Photo Upload (Optional)
│       └── Step 6: Account Creation & Profile Submission
```

### Data Flow Architecture

```
ProfileWizardContext (Shared State)
├── formData: WizardFormData (unified data store)
├── step: number (current step tracking)
├── updateFormData: (updates) => void
└── localStorage persistence (automatic)

HeroOnboarding → ProfileWizardContext → ProfileCreationModal → API Submission
```

## Components and Interfaces

### 1. ProfileWizardContext

**Purpose**: Centralized state management for the entire profile creation flow

**Interface**:
```typescript
interface ProfileWizardState {
  step: number;
  formData: WizardFormData;
  setStep: (step: number) => void;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  reset: () => void;
}

type WizardFormData = {
  // HeroOnboarding fields
  profileFor?: string;
  gender?: string;
  fullName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  
  // ProfileCreationModal fields
  country?: string;
  city?: string;
  height?: string;
  maritalStatus?: string;
  physicalStatus?: string;
  motherTongue?: string;
  religion?: string;
  ethnicity?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  education?: string;
  occupation?: string;
  annualIncome?: string;
  aboutMe?: string;
  preferredGender?: string;
  partnerPreferenceAgeMin?: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceCity?: string[];
  profileImageIds?: string[];
  email?: string;
}
```

**Key Features**:
- Automatic localStorage persistence using `STORAGE_KEYS.PROFILE_CREATION`
- Data filtering to remove empty values before storage
- Restoration of data on component mount
- Unified storage key for both components

### 2. HeroOnboarding Component

**Purpose**: Initial user engagement and basic data collection

**Step Flow**:
1. **Step 1**: Profile purpose (self, son, daughter, etc.) + Gender selection
2. **Step 2**: Full name + Date of birth (with age validation ≥18)
3. **Step 3**: Phone number (with international format validation)

**Key Features**:
- Progress indicator (3 steps)
- Real-time validation with error display
- Age calculation and validation
- Phone number format validation with PhoneInput component
- Automatic modal trigger after Step 3 completion

**Validation Rules**:
- All fields required for progression
- Age must be ≥18 years
- Phone number must match international format: `^\+\d{1,4}\s?\d{6,14}$`

### 3. ProfileCreationModal Component

**Purpose**: Comprehensive profile data collection and account creation

**Step Flow** (adjusted based on HeroOnboarding data):
1. **Step 1**: Location & Physical (country, city, height, marital status, physical status)
2. **Step 2**: Cultural & Lifestyle (mother tongue, religion, ethnicity, diet, smoking, drinking)
3. **Step 3**: Education & Career (education, occupation, annual income, about me)
4. **Step 4**: Partner Preferences (preferred gender, age range, preferred cities)
5. **Step 5**: Photo Upload (optional, drag-and-drop interface)
6. **Step 6**: Account Creation (CustomSignupForm integration)

**Key Features**:
- Dynamic step calculation (skips basic info if provided by HeroOnboarding)
- Progress bar showing completion percentage
- Step-by-step validation with Zod schemas
- Image upload with drag-and-drop reordering
- Automatic profile submission after account creation

## Data Models

### ProfileCreationData Interface

```typescript
interface ProfileCreationData {
  // Basic Info (from HeroOnboarding)
  profileFor: string;
  gender: string;
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
  
  // Location & Physical
  country: string;
  city: string;
  height: string;
  maritalStatus: string;
  physicalStatus: string;
  
  // Cultural & Lifestyle
  motherTongue: string;
  religion: string;
  ethnicity: string;
  diet: string;
  smoking: string;
  drinking: string;
  
  // Education & Career
  education: string;
  occupation: string;
  annualIncome: string;
  aboutMe: string;
  
  // Partner Preferences
  preferredGender: string;
  partnerPreferenceAgeMin: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceCity: string[];
  
  // Account & Images
  email: string;
  profileImageIds?: string[];
}
```

### Validation Schemas

**HeroOnboarding Validation**:
```typescript
const onboardingSchema = z.object({
  profileFor: z.string().min(1, "Required"),
  gender: z.string().min(1, "Required"),
  fullName: z.string().min(2, "Required"),
  dateOfBirth: z.string().min(1, "Required"),
  phoneNumber: z.string().regex(/^\+\d{1,4}\s?\d{6,14}$/i, "Enter a valid phone number"),
});
```

**ProfileCreationModal Step Schemas**:
```typescript
const stepSchemas = [
  // Step 1: Location & Physical
  profileSchema.pick({
    country: true,
    city: true,
    height: true,
    maritalStatus: true,
    physicalStatus: true,
  }),
  // Step 2: Cultural & Lifestyle (all optional)
  z.object({
    motherTongue: z.string().optional(),
    religion: z.string().optional(),
    ethnicity: z.string().optional(),
    diet: z.string().optional(),
    smoking: z.string().optional(),
    drinking: z.string().optional(),
  }),
  // Additional steps...
];
```

## Error Handling

### Validation Error Strategy

1. **Real-time Validation**: Field-level validation on blur/change
2. **Step Validation**: Complete step validation before progression
3. **Final Validation**: Comprehensive validation before profile submission
4. **Error Display**: Toast notifications for step errors, inline errors for fields

### Error Recovery Mechanisms

1. **Data Persistence**: All data saved to localStorage for recovery
2. **Retry Logic**: Failed API calls automatically retry with exponential backoff
3. **Graceful Degradation**: Continue with partial data if non-critical fields fail
4. **User Feedback**: Clear error messages with actionable instructions

### Critical Error Scenarios

1. **Missing Required Fields**: Block progression with specific field identification
2. **API Submission Failure**: Preserve data, show retry option, log error details
3. **Authentication Failure**: Sign out user, preserve profile data, show re-authentication
4. **Duplicate Profile**: Prevent creation, redirect to profile edit, clear onboarding data

## Testing Strategy

### Unit Testing

1. **Context Testing**: ProfileWizardContext state management and persistence
2. **Component Testing**: Individual step validation and data handling
3. **Integration Testing**: Data flow between HeroOnboarding and ProfileCreationModal
4. **API Testing**: Profile submission with various data combinations

### Validation Testing

1. **Field Validation**: Test all validation rules for each field type
2. **Step Progression**: Ensure proper step flow and data preservation
3. **Error Scenarios**: Test all error conditions and recovery mechanisms
4. **Edge Cases**: Empty data, malformed data, network failures

### User Experience Testing

1. **Flow Testing**: Complete user journey from start to finish
2. **Mobile Testing**: Responsive behavior and touch interactions
3. **Performance Testing**: Load times, image upload performance
4. **Accessibility Testing**: Keyboard navigation, screen reader compatibility

## Security Considerations

### Data Protection

1. **Local Storage**: Only non-sensitive data stored locally
2. **API Communication**: All requests use HTTPS with proper authentication
3. **Token Management**: Secure token handling with expiration checks
4. **Input Sanitization**: All user inputs sanitized before storage/submission

### Authentication Integration

1. **Token Validation**: Verify authentication before profile submission
2. **Session Management**: Handle token expiration gracefully
3. **Duplicate Prevention**: Check for existing profiles before creation
4. **Authorization**: Ensure users can only create their own profiles

## Performance Optimizations

### Loading and Rendering

1. **Lazy Loading**: Components loaded as needed
2. **Image Optimization**: Compress and resize uploaded images
3. **Debounced Validation**: Reduce validation frequency during typing
4. **Memoization**: Cache expensive calculations and validations

### Data Management

1. **Efficient Storage**: Filter empty values before localStorage writes
2. **Batch Updates**: Group related state updates
3. **Memory Management**: Clean up event listeners and timers
4. **Network Optimization**: Retry failed requests with exponential backoff

## Integration Points

### Authentication System Integration

```typescript
// CustomSignupForm integration
const handleAccountCreation = async () => {
  const result = await signUp(email, password, firstName, lastName);
  if (result.success) {
    // Trigger profile submission
    await submitProfileData();
  }
};
```

### Profile API Integration

```typescript
// Profile submission flow
const submitProfile = async (token: string, profileData: ProfileCreationData) => {
  // Validate required fields
  const validation = validateRequiredFields(profileData);
  if (!validation.isValid) throw new Error(validation.error);
  
  // Submit to API
  const response = await submitProfile(token, profileData, "create");
  if (!response.success) throw new Error(response.error);
  
  // Upload images if present
  await uploadPendingImages(token, pendingImages);
  
  // Clean up and redirect
  clearAllOnboardingData();
  router.push("/success");
};
```

### Image Upload Integration

```typescript
// Image handling flow
const handleImageUpload = async (images: ImageType[]) => {
  // Store image objects for later upload
  setPendingImages(images);
  
  // Store image IDs in form data
  const imageIds = images.map(img => img.id);
  updateFormData({ profileImageIds: imageIds });
  
  // Persist to localStorage
  localStorage.setItem("pendingProfileImages", JSON.stringify(imageIds));
};
```

## Deployment Considerations

### Environment Configuration

1. **API Endpoints**: Configurable API base URLs
2. **Storage Keys**: Environment-specific localStorage keys
3. **Feature Flags**: Toggle features based on environment
4. **Error Reporting**: Different error handling for dev/prod

### Monitoring and Analytics

1. **Step Completion Tracking**: Monitor drop-off rates per step
2. **Error Logging**: Comprehensive error tracking and reporting
3. **Performance Metrics**: Track load times and user interactions
4. **Conversion Tracking**: Monitor completion rates and success metrics

This design ensures a robust, user-friendly profile creation experience that seamlessly integrates HeroOnboarding with ProfileCreationModal while maintaining data integrity and providing excellent error handling.