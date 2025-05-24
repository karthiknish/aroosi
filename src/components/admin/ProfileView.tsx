import { Card, CardTitle } from "@/components/ui/card";
import { Profile } from "@/types/profile";

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

  // Render all profile images in order
  const images = (profile.profileImageIds || []).map((id) => (
    <img
      key={id}
      src={`/api/storage/${id}`}
      alt={profile.fullName || "Profile image"}
      className="w-20 h-20 rounded-lg object-cover border mr-2"
      style={{ display: "inline-block" }}
    />
  ));

  return (
    <Card className="w-full max-w-2xl p-6 border rounded-lg shadow-sm">
      {/* Images row */}
      {images.length > 0 && (
        <div className="flex flex-row gap-2 mb-4">{images}</div>
      )}
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
