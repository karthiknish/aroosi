import { Card, CardTitle } from "@/components/ui/card";
import { Profile } from "@/types/profile";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Loader2, User } from "lucide-react";

interface ProfileImage {
  _id: Id<"images">;
  storageId: string;
  url: string | null;
  fileName: string;
  uploadedAt: number;
}

export default function ProfileView({ profile }: { profile: Profile }) {
  // Calculate age from dateOfBirth if possible
  let age: string | number = "-";
  if (profile.dateOfBirth) {
    const dob = new Date(profile.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const today = new Date();
      let years = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        years--;
      }
      age = years;
    }
  }

  // Get profile images with proper URLs
  const result = useQuery(
    api.images.getProfileImages, 
    profile.userId ? { userId: profile.userId as Id<"users"> } : "skip"
  );

  // Debug log to check the API response
  console.log('Profile images API response:', { 
    result, 
    hasResult: !!result,
    isArray: Array.isArray(result),
    profileUserId: profile.userId,
    profile: {
      userId: profile.userId,
      hasProfileImageIds: !!profile.profileImageIds,
      profileImageIds: profile.profileImageIds
    }
  });
  
  // Log the first image URL if available
  if (Array.isArray(result) && result.length > 0) {
    console.log('First image data:', {
      id: result[0]._id,
      storageId: result[0].storageId,
      url: result[0].url,
      hasUrl: !!result[0].url
    });
  }

  // Handle loading state
  if (result === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Handle error state
  if (result === null) {
    console.error("Error loading profile images: null response");
    return (
      <div className="p-4 text-red-500 text-sm">
        Error loading images. Please try again later.
      </div>
    );
  }

  // Ensure we have an array of images
  const profileImages: ProfileImage[] = Array.isArray(result) 
    ? result.filter(img => img && img._id && img.storageId)
    : [];
  
  console.log('Processed profile images:', profileImages);

  // Get the first image as profile image or use placeholder
  const profileImage = profileImages.length > 0 ? profileImages[0] : null;

  // Render all profile images in order
  const images = (profileImages || []).map((img, index) => (
    <div 
      key={img._id} 
      className={`relative w-20 h-20 rounded-lg overflow-hidden border mr-2 ${
        index === 0 ? 'ring-2 ring-primary' : ''
      }`}
    >
      <Image
        src={img.url}
        alt={profile.fullName || "Profile image"}
        fill
        className="object-cover"
        sizes="80px"
        onError={(e) => {
          // Fallback to a placeholder if image fails to load
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = '/placeholder-user.jpg';
        }}
      />
      {index === 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
          Profile
        </div>
      )}
    </div>
  ));

  // Add placeholder if no images
  if (profileImages.length === 0) {
    images.push(
      <div key="placeholder" className="relative w-20 h-20 rounded-lg overflow-hidden border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
        <span>No Image</span>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl p-6 border rounded-lg shadow-sm">
      {/* Profile image and details row */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        {/* Profile image */}
        <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden border-2 border-primary/20 bg-white">
          {profileImage ? (
            <Image
              src={profileImage.url}
              alt={profile.fullName || "Profile image"}
              width={128}
              height={128}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = '/placeholder-user.jpg';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <User className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>
        
        {/* Profile details */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            {profile.fullName || 'No Name'}
          </h2>
          {profile.bio && (
            <p className="mt-1 text-gray-600">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Images grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Profile Photos</h3>
        <div className="flex flex-wrap gap-2">{images}</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        <div>
          <span className="block text-xs text-gray-500">Gender</span>
          <span className="font-medium text-gray-700">
            {profile.gender
              ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
              : "-"}
          </span>
        </div>
        <div>
          <span className="block text-xs text-gray-500">Age</span>
          <span className="font-medium text-gray-700">{age}</span>
        </div>
        <div>
          <span className="block text-xs text-gray-500">City</span>
          <span className="font-medium text-gray-700">
            {profile.ukCity || "-"}
          </span>
        </div>

        <div>
          <span className="block text-xs text-gray-500">Religion</span>
          <span className="font-medium text-gray-700">
            {profile.religion || "-"}
          </span>
        </div>
        <div>
          <span className="block text-xs text-gray-500">Caste</span>
          <span className="font-medium text-gray-700">
            {profile.caste || "-"}
          </span>
        </div>

        <div>
          <span className="block text-xs text-gray-500">Height</span>
          <span className="font-medium text-gray-700">
            {profile.height || "-"}
          </span>
        </div>
        <div>
          <span className="block text-xs text-gray-500">Marital Status</span>
          <span className="font-medium text-gray-700">
            {profile.maritalStatus || "-"}
          </span>
        </div>
        <div>
          <span className="block text-xs text-gray-500">Education</span>
          <span className="font-medium text-gray-700">
            {profile.education || "-"}
          </span>
        </div>
        <div>
          <span className="block text-xs text-gray-500">Occupation</span>
          <span className="font-medium text-gray-700">
            {profile.occupation || "-"}
          </span>
        </div>

        <div>
          <span className="block text-xs text-gray-500">Phone Number</span>
          <span className="font-medium text-gray-700">
            {profile.phoneNumber || "-"}
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-xs text-gray-400">
          Created: {new Date(profile.createdAt).toLocaleDateString()}
        </span>
        {profile.updatedAt && (
          <span className="text-xs text-gray-400">
            Updated: {new Date(profile.updatedAt).toLocaleDateString()}
          </span>
        )}
        {profile.banned && (
          <span className="text-xs text-red-500 font-semibold ml-2">
            BANNED
          </span>
        )}
      </div>
    </Card>
  );
}

export function ProfileMinifiedView({ profile }: { profile: Profile }) {
  // Calculate age from dateOfBirth if possible
  let age: string | number = "-";
  if (profile.dateOfBirth) {
    const dob = new Date(profile.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const today = new Date();
      let years = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        years--;
      }
      age = years;
    }
  }
  return (
    <div className="flex items-center gap-4 p-2 border rounded-md bg-gray-50">
      <div className="flex flex-col">
        <span className="text-sm text-gray-600">
          {profile.gender
            ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
            : "-"}
          {" | "}
          {profile.ukCity || "-"}
          {" | Age: "}
          {age}
        </span>
        <span className="text-xs text-gray-500">
          {profile.occupation || "-"}
          {" | "}
          {profile.education || "-"}
        </span>
        <span className="text-xs text-gray-500">
          {profile.religion || "-"}
          {" | "}
          {profile.maritalStatus || "-"}
        </span>
      </div>
    </div>
  );
}
