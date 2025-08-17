import { storage } from "@/lib/firebaseClient";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata
} from "firebase/storage";
import { AuthenticatedUser } from "@/lib/auth/firebaseAuth";

// Define storage paths
export const STORAGE_PATHS = {
  profileImages: (userId: string) => `users/${userId}/profile-images`,
  profileImage: (userId: string, fileName: string) => `users/${userId}/profile-images/${fileName}`,
  blogImages: "blog-images",
  blogImage: (fileName: string) => `blog-images/${fileName}`,
  voiceMessages: (userId: string) => `users/${userId}/voice-messages`,
  voiceMessage: (userId: string, fileName: string) => `users/${userId}/voice-messages/${fileName}`,
};

// Upload a file to Firebase Storage
export async function uploadFile(
  file: File, 
  path: string, 
  metadata?: any
): Promise<{ url: string; storageId: string }> {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(snapshot.ref);
    return { url, storageId: snapshot.ref.fullPath };
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    throw new Error("Failed to upload file");
  }
}

// Upload a profile image
export async function uploadProfileImage(
  userId: string,
  file: File,
  user: AuthenticatedUser
): Promise<{ url: string; storageId: string }> {
  try {
    // Validate that the user is uploading their own image
    if (user.id !== userId) {
      throw new Error("Unauthorized: Cannot upload image for another user");
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}_${file.size}.${fileExtension}`;
    const path = STORAGE_PATHS.profileImage(userId, fileName);

    // Upload the file
    const result = await uploadFile(file, path, {
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      }
    });

    return result;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw new Error("Failed to upload profile image");
  }
}

// Upload a blog image
export async function uploadBlogImage(
  file: File,
  customFileName?: string
): Promise<{ url: string; storageId: string }> {
  try {
    // Generate a unique filename if not provided
    const fileName = customFileName || `${Date.now()}_${file.size}_${file.name}`;
    const path = STORAGE_PATHS.blogImage(fileName);

    // Upload the file
    const result = await uploadFile(file, path, {
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      }
    });

    return result;
  } catch (error) {
    console.error("Error uploading blog image:", error);
    throw new Error("Failed to upload blog image");
  }
}

// Upload a voice message
export async function uploadVoiceMessage(
  userId: string,
  file: File,
  user: AuthenticatedUser
): Promise<{ url: string; storageId: string }> {
  try {
    // Validate that the user is uploading their own voice message
    if (user.id !== userId) {
      throw new Error("Unauthorized: Cannot upload voice message for another user");
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'mp3';
    const fileName = `${timestamp}_${file.size}.${fileExtension}`;
    const path = STORAGE_PATHS.voiceMessage(userId, fileName);

    // Upload the file
    const result = await uploadFile(file, path, {
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      }
    });

    return result;
  } catch (error) {
    console.error("Error uploading voice message:", error);
    throw new Error("Failed to upload voice message");
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

// Delete a file
export async function deleteFile(storageId: string): Promise<void> {
  try {
    const fileRef = ref(storage, storageId);
    await deleteObject(fileRef);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
}

// List all files in a directory
export async function listFiles(path: string): Promise<{ name: string; url: string; storageId: string }[]> {
  try {
    const listRef = ref(storage, path);
    const res = await listAll(listRef);
    
    const files = await Promise.all(
      res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return {
          name: itemRef.name,
          url,
          storageId: itemRef.fullPath,
        };
      })
    );
    
    return files;
  } catch (error) {
    console.error("Error listing files:", error);
    throw new Error("Failed to list files");
  }
}

// Get file metadata
export async function getFileMetadata(storageId: string): Promise<any> {
  try {
    const fileRef = ref(storage, storageId);
    return await getMetadata(fileRef);
  } catch (error) {
    console.error("Error getting file metadata:", error);
    throw new Error("Failed to get file metadata");
  }
}

// Update file metadata
export async function updateFileMetadata(storageId: string, metadata: any): Promise<any> {
  try {
    const fileRef = ref(storage, storageId);
    return await updateMetadata(fileRef, metadata);
  } catch (error) {
    console.error("Error updating file metadata:", error);
    throw new Error("Failed to update file metadata");
  }
}

// Get all profile images for a user
export async function getProfileImages(userId: string): Promise<{ url: string; storageId: string }[]> {
  try {
    const path = STORAGE_PATHS.profileImages(userId);
    const files = await listFiles(path);
    return files.map(file => ({
      url: file.url,
      storageId: file.storageId,
    }));
  } catch (error) {
    console.error("Error getting profile images:", error);
    return [];
  }
}