import { useState, useCallback } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { uploadProfileImageWithProgress } from "@/lib/utils/imageUtil";

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

      if (uploadType !== "profileImage") {
        const errorMsg = `Unsupported upload type: ${uploadType}`;
        setUploadProgress({ progress: 0, isUploading: false, error: errorMsg });
        onUploadError?.(errorMsg);
        throw new Error(errorMsg);
      }

      setUploadProgress({ progress: 0, isUploading: true, error: null });

      try {
        const result = await uploadProfileImageWithProgress(
          file,
          (loaded, total) => {
            const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
            setUploadProgress((prev) => ({
              ...prev,
              progress: Math.max(0, Math.min(100, percent)),
              isUploading: true,
              error: null,
            }));
          }
        );

        const url = result?.url || "";
        const storageId = String(result?.imageId || "");

        setUploadProgress({ progress: 100, isUploading: false, error: null });
        onUploadComplete?.({ url, storageId });
        return { url, storageId };
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