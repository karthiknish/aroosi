import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Save, X, Eye } from "lucide-react";
import { Id } from "@/../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import ProfileEditForm from "./ProfileEditForm";
import ProfileView from "./ProfileView";

interface Profile {
  _id: string;
  userId: string;
  clerkId: string;
  isProfileComplete?: boolean;
  fullName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  ukCity?: string;
  ukPostcode?: string;
  religion?: string;
  caste?: string;
  motherTongue?: string;
  height?: string;
  maritalStatus?: "single" | "divorced" | "widowed" | "annulled";
  education?: string;
  occupation?: string;
  annualIncome?: number;
  aboutMe?: string;
  phoneNumber?: string;
  diet?: "vegetarian" | "non-vegetarian" | "vegan" | "eggetarian" | "other";
  smoking?: "no" | "occasionally" | "yes";
  drinking?: "no" | "occasionally" | "yes";
  physicalStatus?: "normal" | "differently-abled" | "other";
  partnerPreferenceAgeMin?: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceReligion?: string[];
  partnerPreferenceUkCity?: string[];
  profileImageIds?: string[];
  banned?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ProfileCardProps {
  profile: Profile;
  editingId: string | null;
  editForm: any;
  onStartEdit: (profile: Profile) => void;
  onSaveEdit: (id: Id<"profiles">) => void;
  onCancelEdit: () => void;
  onDelete: (id: Id<"profiles">) => void;
  onToggleBan: (id: Id<"profiles">, banned: boolean) => void;
  setDeleteId: (id: Id<"profiles"> | null) => void;
}

export default function ProfileCard({
  profile,
  editingId,
  editForm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggleBan,
  setDeleteId,
}: ProfileCardProps) {
  const router = useRouter();

  // Local state for edit form and loading
  const [localEditForm, setLocalEditForm] = useState(editForm || {});
  const [isSaving, setIsSaving] = useState(false);

  // When editingId changes, sync localEditForm with editForm
  // (in case parent updates editForm)
  // This is optional, but helps keep things in sync
  // You may want to use useEffect here if needed

  // Handle input change for text/number fields
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setLocalEditForm((prev: any) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  // Handle select change
  const handleSelectChange = (name: string, value: any) => {
    setLocalEditForm((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle checkbox change (for boolean fields)
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setLocalEditForm((prev: any) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Call parent onSaveEdit with the profile id and localEditForm
      // You may want to pass localEditForm up, or update parent state before calling onSaveEdit
      // For now, just call onSaveEdit
      await onSaveEdit(profile._id as Id<"profiles">, localEditForm);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card key={profile._id as string} className="relative">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
            {profile.profileImageIds && profile.profileImageIds.length > 0 ? (
              <img
                src={`/api/storage/${profile.profileImageIds[0]}`}
                alt={profile.fullName || "Unnamed"}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-pink-600 text-xl font-semibold">
                {profile.fullName?.charAt(0) || "?"}
              </span>
            )}
          </div>
          <div>
            <CardTitle className="text-xl">
              {profile.fullName || "Unnamed"}
            </CardTitle>
            <div className="text-sm text-gray-500">{profile.ukCity || "-"}</div>
          </div>
        </div>
        <div className="flex space-x-2">
          {editingId === profile._id ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onSaveEdit(profile._id as Id<"profiles">, localEditForm)
                }
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelEdit}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  router.push(`/admin/profile/${profile._id}`);
                }}
              >
                <span className="flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocalEditForm(profile);
                  onStartEdit(profile);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteId(profile._id as Id<"profiles">)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                variant={profile.banned ? "secondary" : "destructive"}
                size="sm"
                onClick={() =>
                  onToggleBan(
                    profile._id as Id<"profiles">,
                    profile.banned || false
                  )
                }
              >
                {profile.banned ? "Unban" : "Ban"}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editingId === profile._id ? (
          <ProfileEditForm
            profile={profile}
            editForm={localEditForm}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onCheckboxChange={handleCheckboxChange}
            onSubmit={handleSubmit}
            loading={isSaving}
          />
        ) : (
          <ProfileView profile={profile} />
        )}
      </CardContent>
    </Card>
  );
}
