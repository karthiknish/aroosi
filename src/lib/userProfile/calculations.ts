import { UserProfile } from '@/lib/userProfile';

export function calculateProfileCompletion(profile: Partial<UserProfile>): number {
  const required: (keyof UserProfile)[] = ['fullName','dateOfBirth','gender','city','country','maritalStatus','education','occupation','religion','aboutMe','profileImageUrls'];
  const optional: (keyof UserProfile)[] = ['height','motherTongue','ethnicity','diet','smoking','drinking','annualIncome','hobbies','interests'];
  let reqDone = 0; let optDone = 0;
  for (const f of required) if (profile[f] !== undefined && profile[f] !== null && profile[f] !== '') reqDone++;
  for (const f of optional) if (profile[f] !== undefined && profile[f] !== null && profile[f] !== '') optDone++;
  const requiredPct = (reqDone / required.length) * 70;
  const optionalPct = (optDone / optional.length) * 30;
  return Math.round(requiredPct + optionalPct);
}
