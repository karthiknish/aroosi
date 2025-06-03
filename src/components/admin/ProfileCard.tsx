import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Save, X, Eye } from "lucide-react";
import { Id } from "@/../convex/_generated/dataModel";
import type { Profile } from "@/types/profile";
import type { ImageType } from "@/types/image";
import { useRouter } from "next/navigation";
import ProfileEditForm from "./ProfileEditForm";
import ProfileView from "./ProfileView";
import { useCallback } from "react";
import { useAuthContext } from "../AuthProvider";

// Add at the top, after imports
type RawImage = {
  url?: string;
  storageId?: string;
  _id?: string;
  fileName?: string;
  uploadedAt?: number;
  [key: string]: unknown;
};

export type ProfileEditFormState = {
  fullName?: string;
  ukCity?: string;
  gender?: string;
  dateOfBirth?: string;
  religion?: string;
  caste?: string;
  motherTongue?: string;
  height?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  annualIncome?: number | string;
  aboutMe?: string;
  phoneNumber?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  physicalStatus?: string;
  partnerPreferenceAgeMin?: number | string;
  partnerPreferenceAgeMax?: number | string;
  partnerPreferenceReligion?: string[];
  partnerPreferenceUkCity?: string[];
  profileImageIds?: string[];
  banned?: boolean;
};

interface ProfileCardProps {
  profile: Profile;
  editingId: string | null;
  editForm: ProfileEditFormState;
  onStartEdit: (profile: Profile) => void;
  onSaveEdit: (id: Id<"profiles">) => void;
  onCancelEdit: () => void;
  onDelete: (id: Id<"profiles">) => void;
  onToggleBan: (id: Id<"profiles">, banned: boolean) => void;
  setDeleteId: (id: Id<"profiles"> | null) => void;
  onEditFormChange?: (updates: Partial<ProfileEditFormState>) => void;
  images?: ImageType[];
  adminUpdateProfile?: (args: {
    id: string;
    updates: { profileImageIds: string[] };
  }) => Promise<unknown>;
}

export default function ProfileCard({
  profile,
  editingId,
  editForm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleBan,
  setDeleteId,
  onEditFormChange,
  images = [],
  adminUpdateProfile,
}: ProfileCardProps) {
  const router = useRouter();
  console.log(profile);
  const { token } = useAuthContext();

  // Loading state for save operation
  const [isSaving, setIsSaving] = useState(false);
  const [fetchedImages, setFetchedImages] = useState<
    ImageType[] | null | undefined
  >(undefined);

  // Fetch images on mount and whenever edit mode is entered (editingId === profile._id)
  useEffect(() => {
    if (editingId === profile._id) {
      async function fetchImages() {
        console.log("[ProfileCard] fetchImages called for profile:", profile);
        console.log("[ProfileCard] token:", token);
        // Guard: Only fetch if userId and token are present
        if (!profile.userId || !token) {
          setFetchedImages([]);
          console.warn(
            "[ProfileCard] Missing userId or token. userId:",
            profile.userId,
            "token:",
            token
          );
          return;
        }
        setFetchedImages(undefined); // Set to loading state
        try {
          const res = await fetch(
            `/api/profile-detail/${profile.userId}/images`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          console.log("[ProfileCard] fetch response status:", res.status);
          if (!res.ok) {
            const errorText = await res.text();
            console.error("[ProfileCard] fetch error:", errorText);
            throw new Error(`Failed to fetch images. Status: ${res.status}`);
          }
          const data = await res.json();
          console.log("[ProfileCard] fetch response data:", data);
          // Accept any of these keys, fallback to empty array
          const images =
            (Array.isArray(data) && data) ||
            data.userProfileImages ||
            data.images ||
            [];
          // Ensure each image has at least url and storageId
          const normalized = (images as RawImage[])
            .filter((img) => img && (img.url || img.storageId))
            .map((img) => ({
              url: typeof img.url === "string" ? img.url : "",
              storageId:
                typeof img.storageId === "string"
                  ? img.storageId
                  : typeof img._id === "string"
                    ? img._id
                    : "",
              fileName: typeof img.fileName === "string" ? img.fileName : "",
              uploadedAt:
                typeof img.uploadedAt === "number" ? img.uploadedAt : 0,
              id:
                typeof img.storageId === "string"
                  ? img.storageId
                  : typeof img._id === "string"
                    ? img._id
                    : "",
            }));
          setFetchedImages(normalized);
        } catch {
          setFetchedImages(null); // Error state
        }
      }
      fetchImages();
    }
  }, [editingId, profile.userId, profile._id, token]);

  // Add handler for image changes - now updates parent editForm and re-fetches images
  const handleImagesChanged = useCallback(
    async (newImageIds: string[]) => {
      onEditFormChange?.({
        profileImageIds: newImageIds,
      });
      // Re-fetch images after upload/reorder
      if (profile.userId && token) {
        try {
          const res = await fetch(
            `/api/profile-detail/${profile.userId}/images`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (res.ok) {
            const data = await res.json();
            const images =
              (Array.isArray(data) && data) ||
              data.userProfileImages ||
              data.images ||
              [];
            const normalized = (images as RawImage[])
              .filter((img) => img && (img.url || img.storageId))
              .map((img) => ({
                url: typeof img.url === "string" ? img.url : "",
                storageId:
                  typeof img.storageId === "string"
                    ? img.storageId
                    : typeof img._id === "string"
                      ? img._id
                      : "",
                fileName: typeof img.fileName === "string" ? img.fileName : "",
                uploadedAt:
                  typeof img.uploadedAt === "number" ? img.uploadedAt : 0,
                id:
                  typeof img.storageId === "string"
                    ? img.storageId
                    : typeof img._id === "string"
                      ? img._id
                      : "",
              }));
            setFetchedImages(normalized);
          }
        } catch {
          setFetchedImages(null);
        }
      }
    },
    [onEditFormChange, profile.userId, token]
  );

  // Handle input change for text/number fields
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    onEditFormChange?.({
      [name]: type === "number" ? Number(value) : value,
    });
  };

  // Handle select change
  const handleSelectChange = (name: string, value: string | undefined) => {
    onEditFormChange?.({
      [name]: value,
    });
  };

  // Handle checkbox change
  const handleCheckboxChange = (name: string, checked: boolean) => {
    onEditFormChange?.({ [name]: checked });
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveEdit(profile._id as Id<"profiles">);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card key={profile._id as string} className="relative">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex space-x-2">
          {editingId === profile._id ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSaveEdit(profile._id as Id<"profiles">)}
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
            editForm={editForm}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onCheckboxChange={handleCheckboxChange}
            onSubmit={handleSubmit}
            loading={isSaving}
            onImagesChanged={handleImagesChanged}
            fetchedImages={fetchedImages}
            adminUpdateProfile={adminUpdateProfile}
          />
        ) : (
          <ProfileView
            profiledata={profile}
            images={fetchedImages || images || []}
          />
        )}
      </CardContent>
    </Card>
  );
}
