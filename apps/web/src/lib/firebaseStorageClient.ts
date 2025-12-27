import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";
import type { ProfileImageInfo } from "@aroosi/shared/types";

// Upload a file to Firebase Storage with progress tracking
export async function uploadFileWithProgress(
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<ProfileImageInfo> {
  try {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return await new Promise<ProfileImageInfo>((resolve, reject) => {
      uploadTask.on("state_changed", (snap) => {
        if (onProgress) {
          const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
          onProgress(progress);
        }
      }, (err) => {
        console.error("Upload error", err);
        reject(new Error("Failed to upload file"));
      }, async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ 
            url, 
            storageId: uploadTask.snapshot.ref.fullPath,
            fileName: file.name,
            size: file.size,
            contentType: file.type,
            uploadedAt: new Date().toISOString()
          });
        } catch (e) {
          reject(new Error("Failed to obtain download URL"));
        }
      });
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file");
  }
}

// Upload a profile image
export async function uploadProfileImage(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<ProfileImageInfo> {
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}_${uuidv4()}.${fileExtension}`;
    const path = `users/${userId}/profile-images/${fileName}`;
    
    return await uploadFileWithProgress(file, path, onProgress);
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw new Error("Failed to upload profile image");
  }
}

// Upload a blog image
export async function uploadBlogImage(
  file: File,
  customFileName?: string,
  onProgress?: (progress: number) => void
): Promise<ProfileImageInfo> {
  try {
    // Generate a unique filename if not provided
    const fileName = customFileName || `${Date.now()}_${uuidv4()}_${file.name}`;
    const path = `blog-images/${fileName}`;
    
    return await uploadFileWithProgress(file, path, onProgress);
  } catch (error) {
    console.error("Error uploading blog image:", error);
    throw new Error("Failed to upload blog image");
  }
}

// Upload a voice message
export async function uploadVoiceMessage(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<ProfileImageInfo> {
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'mp3';
    const fileName = `${timestamp}_${uuidv4()}.${fileExtension}`;
    const path = `users/${userId}/voice-messages/${fileName}`;
    
    return await uploadFileWithProgress(file, path, onProgress);
  } catch (error) {
    console.error("Error uploading voice message:", error);
    throw new Error("Failed to upload voice message");
  }
}

// Delete a file from Firebase Storage
export async function deleteFile(storageId: string): Promise<void> {
  try {
    const fileRef = ref(storage, storageId);
    await deleteObject(fileRef);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
}

// Get download URL for a file
export async function getFileUrl(storageId: string): Promise<string> {
  try {
    const fileRef = ref(storage, storageId);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error("Error getting file URL:", error);
    throw new Error("Failed to get file URL");
  }
}