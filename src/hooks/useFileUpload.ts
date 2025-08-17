import { useState, useCallback } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";

interface UploadProgress {
  progress: number;
  isUploading: boolean;
  error: string | null;
}

interface UseFileUploadProps {
  onUploadComplete?: (result: { url: string; storageId: string }) => void;
  onUploadError?: (error: string) => void;
}

export function useFileUpload({ onUploadComplete, onUploadError }: UseFileUploadProps = {}) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    isUploading: false,
    error: null,
  });
  
  const { user } = useFirebaseAuth();

  const uploadFile = useCallback(
    async (file: File, uploadType: "profileImage" | "blogImage" | "voiceMessage" = "profileImage") => {
      if (!user) {
        const errorMsg = "User not authenticated";
        setUploadProgress({ progress: 0, isUploading: false, error: errorMsg });
        onUploadError?.(errorMsg);
        return;
      }

      setUploadProgress({ progress: 0, isUploading: true, error: null });

      try {
        const formData = new FormData();
        formData.append("file", file);
  formData.append("userId", user.uid);

        // Determine the API endpoint based on upload type
        let endpoint = "";
        switch (uploadType) {
          case "profileImage":
            endpoint = "/api/profile-images/firebase";
            break;
          case "blogImage":
            endpoint = "/api/blog/images";
            break;
          case "voiceMessage":
            endpoint = "/api/voice-messages/firebase";
            break;
          default:
            endpoint = "/api/profile-images/firebase";
        }

        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Upload failed");
        }

        setUploadProgress({ progress: 100, isUploading: false, error: null });
        onUploadComplete?.({ url: result.url, storageId: result.storageId });
        return { url: result.url, storageId: result.storageId };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Upload failed";
        setUploadProgress({ progress: 0, isUploading: false, error: errorMsg });
        onUploadError?.(errorMsg);
        throw error;
      }
    },
    [user, onUploadComplete, onUploadError]
  );

  const resetProgress = useCallback(() => {
    setUploadProgress({ progress: 0, isUploading: false, error: null });
  }, []);

  return {
    uploadFile,
    resetProgress,
    ...uploadProgress,
  };
}