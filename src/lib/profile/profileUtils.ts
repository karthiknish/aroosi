import { Profile } from "@/types/profile";

export const checkProfileCompletion = (profile: Profile): boolean => {
  if (!profile) return false;
  
  // List of required fields for a complete profile
  const requiredFields: (keyof Profile)[] = [
    'fullName',
    'gender',
    'dateOfBirth',
    'maritalStatus',
    'religion',
    'caste',
    'ukCity',
    'occupation',
    'education',
    'aboutMe',
    'profileImageIds'
  ];

  return requiredFields.every(field => {
    const value = profile[field];
    return value !== undefined && value !== null && value !== '';
  });
};
