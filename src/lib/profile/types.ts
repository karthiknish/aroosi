export type { Profile } from "@/types/profile";

export type ProfileImage = {
  _id: string;
  storageId: string;
  url: string | null;
  fileName: string;
  uploadedAt: number;
};
