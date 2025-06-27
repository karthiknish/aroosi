# Profile Creation Modal Implementation Plan

## Overview
Transform the current profile creation flow from a separate page (`/sign-up` → `/create-profile`) to a modal-based wizard that starts from the hero section on the home page. The modal will collect all profile information and show the Clerk sign-up form as the final step.

## Current Flow
1. User clicks "Get Started" on home page
2. Redirected to `/sign-up` (Clerk sign-up)
3. After sign-up, redirected to `/create-profile`
4. Complete 6-step profile wizard
5. Profile submitted and user can access the platform

## New Flow
1. User clicks "Get Started" on home page
2. Modal opens with profile creation wizard
3. User fills out all profile information (multiple steps)
4. Final step shows Clerk sign-up form
5. After sign-up, profile is automatically created with collected data
6. User is redirected to dashboard/search

## Modal Structure

### Step 1: Basic Information
- Profile For (dropdown): self, son, daughter, brother, sister, friend, relative
- Gender (buttons): Male, Female
- Full Name (text input)
- Date of Birth (date picker)
- Phone Number (text input)

### Step 2: Location & Physical
- Country (dropdown)
- City (text input)
- Height (dropdown): 4'0" to 7'0"
- Marital Status (dropdown): single, divorced, widowed, annulled
- Physical Status (dropdown): Normal, Physically Challenged

### Step 3: Cultural & Lifestyle
- Mother Tongue (dropdown): Dari, Pashto, English, etc.
- Religion (dropdown): Islam, Other
- Ethnicity (dropdown): Pashtun, Tajik, Hazara, Uzbek, etc.
- Diet (dropdown): Vegetarian, Non-Vegetarian, Halal only, etc.
- Smoking (dropdown): No, Yes, Occasionally
- Drinking (dropdown): No, Yes, Occasionally

### Step 4: Education & Career
- Education (dropdown): High School, Bachelor's, Master's, PhD, etc.
- Occupation (text input)
- Annual Income (dropdown): ranges from "Prefer not to say" to "£100,000+"
- About Me (textarea): Brief description

### Step 5: Partner Preferences
- Preferred Gender (based on user's gender)
- Age Range (min/max sliders)
- Preferred Cities (multi-select)
- Other preferences (optional)

### Step 6: Photos (Optional)
- Upload profile photos
- Set primary photo
- Can skip and add later

### Step 7: Create Account
- Email (pre-filled from Step 1)
- Password
- Confirm Password
- Terms & Conditions checkbox
- Clerk sign-up form embedded

## Technical Implementation

### Components to Create/Modify

1. **ProfileCreationModal.tsx** (Already created, needs expansion)
   - Add all profile fields
   - Implement proper validation
   - Handle image uploads
   - Integrate with Clerk sign-up

2. **HeroOnboarding.tsx** (Keep existing)
   - Modify to open modal instead of redirecting
   - Pass collected data to modal

3. **Profile API Integration**
   - Store collected data in localStorage/session
   - After Clerk sign-up, retrieve data and create profile
   - Handle errors gracefully

### Data Flow

1. **Pre-Sign-Up Data Collection**
   ```typescript
   interface ProfileCreationData {
     // Basic Info
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
     partnerPreferenceAgeMax: number;
     partnerPreferenceCity: string[];
     
     // Photos
     profileImageIds?: string[];
   }
   ```

2. **Storage Strategy**
   - Use `localStorage` to persist data across page refreshes
   - Store as `pendingProfileData`
   - Clear after successful profile creation

3. **Clerk Integration**
   - Use Clerk's `unsafeMetadata` to pass profile data
   - Or retrieve from localStorage after sign-up
   - Handle in `/create-profile` success callback

### Validation Rules

1. **Required Fields**
   - All fields except photos are required
   - Email must be valid format
   - Phone number must be valid format
   - Age must be 18+

2. **Field Dependencies**
   - Preferred gender auto-set based on user gender
   - Partner age range must be valid (min < max)

### UI/UX Considerations

1. **Progress Indicator**
   - Show step progress at top of modal
   - Allow navigation between completed steps
   - Disable forward navigation until current step is valid

2. **Modal Behavior**
   - Prevent closing during sign-up process
   - Show confirmation dialog if user tries to close
   - Save progress in localStorage

3. **Error Handling**
   - Show inline validation errors
   - Handle Clerk sign-up errors gracefully
   - Provide retry mechanism

4. **Mobile Responsiveness**
   - Full-screen modal on mobile
   - Scrollable content
   - Touch-friendly inputs

## Implementation Steps

1. **Phase 1: Extend Modal UI**
   - Add all profile fields to modal
   - Implement step navigation
   - Add validation

2. **Phase 2: Data Management**
   - Implement localStorage persistence
   - Add form state management
   - Handle data transformation

3. **Phase 3: Clerk Integration**
   - Embed Clerk sign-up in final step
   - Handle sign-up success/failure
   - Pass data to profile creation

4. **Phase 4: Profile Creation**
   - Modify create-profile flow
   - Auto-populate from saved data
   - Submit profile automatically

5. **Phase 5: Testing & Polish**
   - Test complete flow
   - Handle edge cases
   - Add loading states
   - Improve animations

## Benefits

1. **Improved UX**
   - Single, cohesive flow
   - No page redirects
   - Better mobile experience

2. **Higher Conversion**
   - Users invest time before sign-up
   - Reduced drop-off rate
   - Clearer value proposition

3. **Data Collection**
   - Gather profile data upfront
   - Personalized onboarding
   - Better initial matches

## Potential Issues & Solutions

1. **Modal Too Long**
   - Solution: Collapsible sections, smart defaults

2. **Sign-Up Failures**
   - Solution: Save progress, allow retry

3. **Mobile Keyboard**
   - Solution: Adjust modal height, scroll to input

4. **Clerk Customization**
   - Solution: Use Clerk appearance API, custom CSS

## Success Metrics

- Conversion rate (modal open → profile created)
- Time to complete profile
- Drop-off rate per step
- User satisfaction scores