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
import { Id } from "@/../convex/_generated/dataModel";

interface Profile {
  _id: string;
  userId: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  ukCity?: string;
  ukPostcode?: string;
  religion?: string;
  caste?: string;
  motherTongue?: string;
  height?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  annualIncome?: number;
  aboutMe?: string;
  phoneNumber?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  physicalStatus?: string;
  partnerPreferenceAgeMin?: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceReligion?: string[];
  partnerPreferenceUkCity?: string[];
  profileImageIds?: string[];
  banned?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ProfileEditFormProps {
  profile: Profile;
  editForm: any;
  onInputChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onSelectChange?: (name: string, value: string) => void;
  onCheckboxChange?: (name: string, checked: boolean) => void;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  loading?: boolean;
}

export default function ProfileEditForm({
  profile,
  editForm,
  onInputChange,
  onSelectChange,
  onCheckboxChange,
  onSubmit,
  loading,
}: ProfileEditFormProps) {
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      {/* Profile Image Management */}
      {profile.userId && (
        <ProfileImageUpload userId={profile.userId as Id<"users">} />
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
        <label className="text-sm font-medium">Religion</label>
        <Input
          name="religion"
          value={editForm.religion || ""}
          onChange={onInputChange}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Caste</label>
        <Input
          name="caste"
          value={editForm.caste || ""}
          onChange={onInputChange}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Mother Tongue</label>
        <Input
          name="motherTongue"
          value={editForm.motherTongue || ""}
          onChange={onInputChange}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Height</label>
        <Input
          name="height"
          value={editForm.height || ""}
          onChange={onInputChange}
        />
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
          onValueChange={(v) => onSelectChange && onSelectChange("diet", v)}
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
          Partner Preference Religion (comma separated)
        </label>
        <Input
          name="partnerPreferenceReligion"
          value={editForm.partnerPreferenceReligion?.join(",") || ""}
          onChange={(e) =>
            onInputChange &&
            onInputChange({
              ...e,
              target: {
                ...e.target,
                name: "partnerPreferenceReligion",
                value: e.target.value,
              },
            })
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
        className="mt-4 px-4 py-2 bg-primary text-white rounded disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}