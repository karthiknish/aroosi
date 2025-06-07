import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";
import { Id } from "@/../convex/_generated/dataModel";
import type { Profile, ProfileEditFormState } from "@/types/profile";
import type { ImageType } from "@/types/image";
import { Slider } from "@/components/ui/slider";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "../AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/../convex/_generated/api";
import { useMutation } from "convex/react";

interface ProfileEditFormProps {
  profile: Profile;
  editForm: ProfileEditFormState;
  onInputChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onSelectChange?: (name: string, value: string | undefined) => void;
  onCheckboxChange?: (name: string, checked: boolean) => void;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  loading?: boolean;
  onImagesChanged?: (newImageIds: string[]) => void;
  adminUpdateProfile?: (args: {
    id: string;
    updates: { profileImageIds: string[] };
  }) => Promise<unknown>;
}

interface ProfileEditFormPropsExtended extends ProfileEditFormProps {
  fetchedImages: ImageType[] | null | undefined;
}

export default function ProfileEditForm({
  profile,
  editForm,
  onInputChange,
  onSelectChange,
  onSubmit,
  loading,
  onImagesChanged,
  fetchedImages,
  adminUpdateProfile,
}: ProfileEditFormPropsExtended) {
  // Add state for images for reorder UI
  const [reorderImages, setReorderImages] = useState<ImageType[]>([]);
  // Add image delete support for admin
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { token } = useAuthContext();

  // Manual match state
  const [matchUserId, setMatchUserId] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const sendInterest = useMutation(api.interests.sendInterest);
  const respondToInterest = useMutation(api.interests.respondToInterest);

  // Show fetched images initially, then update to reorder images when profileImageIds are set
  useEffect(() => {
    // If we have fetchedImages, always show them initially
    if (Array.isArray(fetchedImages) && fetchedImages.length > 0) {
      // If no profileImageIds, just show all fetchedImages
      if (!editForm.profileImageIds || editForm.profileImageIds.length === 0) {
        setReorderImages(fetchedImages);
        return;
      }
      // If profileImageIds exist, order fetchedImages accordingly
      const imageMap = new Map(
        fetchedImages.map((img) => [img.storageId, img])
      );
      const ordered = editForm.profileImageIds
        .map((id) => imageMap.get(id))
        .filter((img): img is ImageType => Boolean(img));
      setReorderImages(ordered);
      return;
    }
    // If no images, clear
    setReorderImages([]);
  }, [fetchedImages, editForm.profileImageIds]);

  // Handler for image reorder
  const handleReorder = (newOrder: ImageType[]) => {
    // Extract storageIds from the reordered images
    const storageIdOrder = newOrder
      .map((img) => img.storageId)
      .filter((id): id is string => !!id);
    if (onImagesChanged) {
      onImagesChanged(storageIdOrder);
    }
  };

  // Add image delete support for admin
  const handleDeleteImage = async (storageId: string) => {
    if (!profile.userId || !storageId || !token) {
      console.warn(
        "[ProfileEditForm] Missing userId, storageId, or token. userId:",
        profile.userId,
        "storageId:",
        storageId,
        "token:",
        token
      );
      return;
    }
    setDeletingImageId(storageId);
    try {
      const res = await fetch(`/api/images`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: profile.userId, imageId: storageId }),
      });
      if (!res.ok) throw new Error("Failed to delete image");
      toast.success("Image deleted");
      // Refetch images from backend to update reorderImages
      if (!profile.userId || !token) return;
      const imgRes = await fetch(
        `/api/profile-detail/${profile.userId}/images`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (imgRes.ok) {
        const data = await imgRes.json();
        setReorderImages(
          (data.userProfileImages || []).filter(
            (img: ImageType) => !!img.url && !!img.storageId
          )
        );
        if (onImagesChanged) {
          const newOrder = (data.userProfileImages || [])
            .filter((img: ImageType) => !!img.url && !!img.storageId)
            .map((img: ImageType) => img.storageId);
          onImagesChanged(newOrder);
        }
      }
    } catch {
      toast.error("Failed to delete image");
    } finally {
      setDeletingImageId(null);
      setConfirmDeleteId(null);
    }
  };

  // Manual match handler
  const handleManualMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.userId || !matchUserId) {
      toast.error("Both user IDs are required");
      return;
    }
    setIsMatching(true);
    try {
      // Send interest from A to B
      const interestA = await sendInterest({
        fromUserId: profile.userId,
        toUserId: matchUserId as Id<"users">,
      });
      if (typeof interestA !== "string") {
        toast.error(interestA?.error || "Failed to send interest (A→B)");
        setIsMatching(false);
        return;
      }
      // Accept interest from A to B
      await respondToInterest({
        interestId: interestA,
        status: "accepted",
      });
      // Send interest from B to A
      const interestB = await sendInterest({
        fromUserId: matchUserId as Id<"users">,
        toUserId: profile.userId,
      });
      if (typeof interestB !== "string") {
        toast.error(interestB?.error || "Failed to send interest (B→A)");
        setIsMatching(false);
        return;
      }
      // Accept interest from B to A
      await respondToInterest({
        interestId: interestB,
        status: "accepted",
      });
      toast.success("Profiles matched successfully!");
      setMatchUserId("");
    } catch (err: unknown) {
      let message = "Failed to match profiles";
      if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
      ) {
        message = (err as { message: string }).message;
      }
      toast.error(message);
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      {/* Show current profile image if available */}

      {/* Profile Image Management */}
      {profile.userId && (
        <>
          <ProfileImageUpload
            isAdmin={true}
            userId={profile.userId as Id<"users">}
            profileId={profile._id as string}
            onImagesChanged={onImagesChanged}
            adminUpdateProfile={adminUpdateProfile}
          />
          {/* Image Reorder UI for Admin */}
          {Array.isArray(reorderImages) && (
            <div className="mt-4">
              <label className="text-sm font-medium mb-2 block">
                Profile Images ({reorderImages.length} images)
              </label>
              <ProfileImageReorder
                images={reorderImages
                  .filter((img) => img.url !== null)
                  .map((img) => ({
                    ...img,
                    url: img.url as string,
                    id: img.storageId ?? "",
                  }))}
                userId={profile.userId as string}
                isAdmin={true}
                profileId={profile._id as string}
                onReorder={handleReorder}
                renderAction={(img) => (
                  <div className="relative group">
                    <img
                      src={img.url}
                      alt="Profile"
                      style={{
                        width: 100,
                        height: 100,
                        objectFit: "cover",
                        borderRadius: 8,
                      }}
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-red-600 hover:bg-white z-10"
                      onClick={() =>
                        img.storageId && setConfirmDeleteId(img.storageId)
                      }
                      disabled={deletingImageId === img.storageId}
                      title="Delete image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              />
            </div>
          )}
        </>
      )}
      <div>
        <label className="text-sm font-medium">Full Name</label>
        <Input
          name="fullName"
          value={editForm.fullName || ""}
          onChange={onInputChange}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Date of Birth</label>
        <Input
          name="dateOfBirth"
          value={editForm.dateOfBirth || ""}
          onChange={onInputChange}
        />
      </div>
      <div>
        <label className="text-sm font-medium">City</label>
        <Input
          name="ukCity"
          value={editForm.ukCity || ""}
          onChange={onInputChange}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Postcode</label>
        <Input
          name="ukPostcode"
          value={editForm.ukPostcode || ""}
          onChange={onInputChange}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Gender</label>
        <Select
          value={editForm.gender || ""}
          onValueChange={(v) => onSelectChange && onSelectChange("gender", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Preferred Gender</label>
        <Select
          value={editForm.preferredGender || ""}
          onValueChange={(v) =>
            onSelectChange && onSelectChange("preferredGender", v)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select preferred gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
            <SelectItem value="any">Any</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Height</label>
        <div className="flex items-center gap-4">
          <Slider
            min={120}
            max={220}
            step={1}
            value={[Number(editForm.height) || 170]}
            onValueChange={([val]) => {
              if (onInputChange) {
                const syntheticEvent = {
                  target: {
                    name: "height",
                    value: String(val),
                  },
                } as React.ChangeEvent<HTMLInputElement>;
                onInputChange(syntheticEvent);
              }
            }}
            className="w-48"
          />
          <span className="text-sm text-gray-700 min-w-[40px]">
            {editForm.height || 170} cm
          </span>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Marital Status</label>
        <Select
          value={editForm.maritalStatus || ""}
          onValueChange={(v) =>
            onSelectChange && onSelectChange("maritalStatus", v)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single</SelectItem>
            <SelectItem value="divorced">Divorced</SelectItem>
            <SelectItem value="widowed">Widowed</SelectItem>
            <SelectItem value="annulled">Annulled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Education</label>
        <Input
          name="education"
          value={editForm.education || ""}
          onChange={onInputChange}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Occupation</label>
        <Input
          name="occupation"
          value={editForm.occupation || ""}
          onChange={onInputChange}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Annual Income</label>
        <Input
          name="annualIncome"
          value={editForm.annualIncome || ""}
          onChange={onInputChange}
          type="number"
        />
      </div>
      <div>
        <label className="text-sm font-medium">About Me</label>
        <Textarea
          name="aboutMe"
          value={editForm.aboutMe || ""}
          onChange={onInputChange}
          rows={4}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Phone Number</label>
        <Input
          name="phoneNumber"
          value={editForm.phoneNumber || ""}
          onChange={onInputChange}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Diet</label>
        <Select
          value={editForm.diet || ""}
          onValueChange={(v) =>
            onSelectChange && onSelectChange("diet", v === "" ? undefined : v)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select diet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vegetarian">Vegetarian</SelectItem>
            <SelectItem value="non-vegetarian">Non-Vegetarian</SelectItem>
            <SelectItem value="vegan">Vegan</SelectItem>
            <SelectItem value="eggetarian">Eggetarian</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Smoking</label>
        <Select
          value={editForm.smoking || ""}
          onValueChange={(v) => onSelectChange && onSelectChange("smoking", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select smoking" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">No</SelectItem>
            <SelectItem value="occasionally">Occasionally</SelectItem>
            <SelectItem value="yes">Yes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Drinking</label>
        <Select
          value={editForm.drinking || ""}
          onValueChange={(v) => onSelectChange && onSelectChange("drinking", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select drinking" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">No</SelectItem>
            <SelectItem value="occasionally">Occasionally</SelectItem>
            <SelectItem value="yes">Yes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Physical Status</label>
        <Select
          value={editForm.physicalStatus || ""}
          onValueChange={(v) =>
            onSelectChange && onSelectChange("physicalStatus", v)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="differently-abled">Differently-abled</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">
          Partner Preference Age Min
        </label>
        <Input
          name="partnerPreferenceAgeMin"
          value={editForm.partnerPreferenceAgeMin || ""}
          onChange={onInputChange}
          type="number"
        />
      </div>
      <div>
        <label className="text-sm font-medium">
          Partner Preference Age Max
        </label>
        <Input
          name="partnerPreferenceAgeMax"
          value={editForm.partnerPreferenceAgeMax || ""}
          onChange={onInputChange}
          type="number"
        />
      </div>
      <div>
        <label className="text-sm font-medium">
          Partner Preference UK City (comma separated)
        </label>
        <Input
          name="partnerPreferenceUkCity"
          value={editForm.partnerPreferenceUkCity?.join(",") || ""}
          onChange={(e) =>
            onInputChange &&
            onInputChange({
              ...e,
              target: {
                ...e.target,
                name: "partnerPreferenceUkCity",
                value: e.target.value,
              },
            })
          }
        />
      </div>

      <button
        type="submit"
        className="mt-4 px-4 py-2 bg-pink-500 text-white rounded disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
          </DialogHeader>
          <div>
            Are you sure you want to delete this image? This action cannot be
            undone.
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              disabled={!!deletingImageId}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteImage(confirmDeleteId!)}
              disabled={!!deletingImageId}
            >
              {deletingImageId ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Match Section (Admin) */}
      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-semibold mb-2">
          Manually Match With Another Profile
        </h3>
        <form className="flex gap-2 items-end" onSubmit={handleManualMatch}>
          <Input
            placeholder="Enter other user's ID"
            value={matchUserId}
            onChange={(e) => setMatchUserId(e.target.value)}
            className="w-64"
          />
          <Button type="submit" disabled={isMatching || !matchUserId}>
            {isMatching ? "Matching..." : "Create Match"}
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-1">
          Enter the user ID of the profile you want to match with this user.
          (Future: add search by email/name)
        </p>
      </div>
    </form>
  );
}
