"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import {
  useQuery as useConvexQuery,
  useMutation as useConvexMutation,
} from "convex/react";
import { Pencil, Trash2, Save, X } from "lucide-react";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import { Id } from "@/../convex/_generated/dataModel";

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

export function ProfileManagement() {
  const [editingId, setEditingId] = useState<Id<"profiles"> | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteId, setDeleteId] = useState<Id<"profiles"> | null>(null);
  const queryClient = useQueryClient();

  // Fetch profiles from Convex
  const profilesRaw = useConvexQuery(api.users.listProfiles, {});

  // Convex mutation for deleting a profile
  const deleteProfile = useConvexMutation(api.users.deleteProfile);

  // Map Convex data to expected types
  const profiles = profilesRaw?.map((profile) => ({
    ...profile,
    _id: profile._id as Id<"profiles">,
    createdAt: profile.createdAt
      ? new Date(profile.createdAt).toISOString()
      : "",
    updatedAt: profile.updatedAt
      ? new Date(profile.updatedAt).toISOString()
      : "",
  }));

  // Update profile mutation
  const adminUpdateProfile = useConvexMutation(api.users.adminUpdateProfile);

  // When starting to edit, pull all editable fields from the profile
  const startEdit = (profile: any) => {
    setEditingId(profile._id as Id<"profiles">);
    setEditForm({
      fullName: profile.fullName || "",
      ukCity: profile.ukCity || "",
      gender: profile.gender || "",
      dateOfBirth: profile.dateOfBirth || "",
      religion: profile.religion || "",
      caste: profile.caste || "",
      motherTongue: profile.motherTongue || "",
      height: profile.height || "",
      maritalStatus: profile.maritalStatus || "",
      education: profile.education || "",
      occupation: profile.occupation || "",
      annualIncome: profile.annualIncome || "",
      aboutMe: profile.aboutMe || "",
      phoneNumber: profile.phoneNumber || "",
      diet: profile.diet || "",
      smoking: profile.smoking || "",
      drinking: profile.drinking || "",
      physicalStatus: profile.physicalStatus || "",
      partnerPreferenceAgeMin: profile.partnerPreferenceAgeMin || "",
      partnerPreferenceAgeMax: profile.partnerPreferenceAgeMax || "",
      partnerPreferenceReligion: profile.partnerPreferenceReligion || [],
      partnerPreferenceUkCity: profile.partnerPreferenceUkCity || [],
      profileImageIds: profile.profileImageIds || [],
      banned: profile.banned || false,
    });
  };

  // Update profile using Convex adminUpdateProfile mutation
  const saveEdit = async (id: Id<"profiles">) => {
    try {
      // Convert empty string enums to undefined
      const enumFields = [
        "gender",
        "maritalStatus",
        "diet",
        "smoking",
        "drinking",
        "physicalStatus",
      ];
      const updates = { ...editForm };
      enumFields.forEach((field) => {
        if (updates[field] === "") updates[field] = undefined;
      });
      // Convert empty string to undefined for number fields
      [
        "annualIncome",
        "partnerPreferenceAgeMin",
        "partnerPreferenceAgeMax",
      ].forEach((field) => {
        if (updates[field] === "") updates[field] = undefined;
        if (
          typeof updates[field] === "string" &&
          updates[field] !== undefined
        ) {
          const num = Number(updates[field]);
          updates[field] = isNaN(num) ? undefined : num;
        }
      });
      await adminUpdateProfile({ id, updates });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Delete logic using Convex mutation
  const handleDelete = async (id: Id<"profiles">) => {
    try {
      await deleteProfile({ id });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Profile deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete profile");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev: typeof editForm) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setEditForm((prev: typeof editForm) => ({ ...prev, [name]: value }));
  };

  // Ban/unban logic
  const toggleBan = async (id: Id<"profiles">, banned: boolean) => {
    try {
      await adminUpdateProfile({ id, updates: { banned: !banned } });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success(banned ? "Profile unbanned" : "Profile banned");
    } catch (error) {
      toast.error("Failed to update ban status");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Profile Management</h2>
      <div className="grid gap-6">
        {profiles?.map((profile) => (
          <Card key={profile._id as string} className="relative">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                  {profile.profileImageIds &&
                  profile.profileImageIds.length > 0 ? (
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
                  <div className="text-sm text-gray-500">
                    {profile.ukCity || "-"}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                {editingId === profile._id ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveEdit(profile._id as Id<"profiles">)}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={cancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(profile)}
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
                        toggleBan(
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
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input
                      name="fullName"
                      value={editForm.fullName || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date of Birth</label>
                    <Input
                      name="dateOfBirth"
                      value={editForm.dateOfBirth || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      name="ukCity"
                      value={editForm.ukCity || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Postcode</label>
                    <Input
                      name="ukPostcode"
                      value={editForm.ukPostcode || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Gender</label>
                    <Select
                      value={editForm.gender || ""}
                      onValueChange={(value) =>
                        handleSelectChange("gender", value)
                      }
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
                    <label className="text-sm font-medium">Religion</label>
                    <Input
                      name="religion"
                      value={editForm.religion || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Caste</label>
                    <Input
                      name="caste"
                      value={editForm.caste || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Mother Tongue</label>
                    <Input
                      name="motherTongue"
                      value={editForm.motherTongue || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Height</label>
                    <Input
                      name="height"
                      value={editForm.height || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Marital Status
                    </label>
                    <Select
                      value={editForm.maritalStatus || ""}
                      onValueChange={(value) =>
                        handleSelectChange("maritalStatus", value)
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
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Occupation</label>
                    <Input
                      name="occupation"
                      value={editForm.occupation || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Annual Income</label>
                    <Input
                      name="annualIncome"
                      value={editForm.annualIncome || ""}
                      onChange={handleInputChange}
                      type="number"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">About Me</label>
                    <Textarea
                      name="aboutMe"
                      value={editForm.aboutMe || ""}
                      onChange={handleInputChange}
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input
                      name="phoneNumber"
                      value={editForm.phoneNumber || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Diet</label>
                    <Select
                      value={editForm.diet || ""}
                      onValueChange={(value) =>
                        handleSelectChange("diet", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select diet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="non-vegetarian">
                          Non-Vegetarian
                        </SelectItem>
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
                      onValueChange={(value) =>
                        handleSelectChange("smoking", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select smoking" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="occasionally">
                          Occasionally
                        </SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Drinking</label>
                    <Select
                      value={editForm.drinking || ""}
                      onValueChange={(value) =>
                        handleSelectChange("drinking", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select drinking" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="occasionally">
                          Occasionally
                        </SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Physical Status
                    </label>
                    <Select
                      value={editForm.physicalStatus || ""}
                      onValueChange={(value) =>
                        handleSelectChange("physicalStatus", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="differently-abled">
                          Differently-abled
                        </SelectItem>
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
                      onChange={handleInputChange}
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
                      onChange={handleInputChange}
                      type="number"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Partner Preference Religion (comma separated)
                    </label>
                    <Input
                      name="partnerPreferenceReligion"
                      value={
                        editForm.partnerPreferenceReligion?.join(",") || ""
                      }
                      onChange={(e) =>
                        setEditForm((prev: typeof editForm) => ({
                          ...prev,
                          partnerPreferenceReligion: e.target.value
                            .split(",")
                            .map((s: string) => s.trim())
                            .filter(Boolean),
                        }))
                      }
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
                        setEditForm((prev: typeof editForm) => ({
                          ...prev,
                          partnerPreferenceUkCity: e.target.value
                            .split(",")
                            .map((s: string) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Profile Images
                    </label>
                    <ProfileImageUpload userId={profile.userId} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.banned || false}
                      onChange={(e) =>
                        setEditForm((prev: typeof editForm) => ({
                          ...prev,
                          banned: e.target.checked,
                        }))
                      }
                    />
                    <label className="text-sm">Banned</label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Gender</p>
                    <p className="font-medium capitalize">
                      {profile.gender || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">City</p>
                    <p className="font-medium">{profile.ukCity || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">About Me</p>
                    <p className="font-medium">{profile.aboutMe || "-"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete this profile? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId! as Id<"profiles">)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
