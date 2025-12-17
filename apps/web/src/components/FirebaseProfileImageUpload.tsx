import React, { useCallback, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, X } from "lucide-react";

interface FirebaseProfileImageUploadProps {
  onImageUpload?: (imageData: { url: string; storageId: string }) => void;
  maxImages?: number;
}

export function FirebaseProfileImageUpload({ 
  onImageUpload,
  maxImages = 3 
}: FirebaseProfileImageUploadProps) {
  const { user } = useFirebaseAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading, progress, error } = useFileUpload({
    onUploadComplete: (result) => {
      showSuccessToast("Image uploaded successfully!");
      onImageUpload?.(result);
      // Reset the form
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onUploadError: (errorMsg) => {
      showErrorToast(errorMsg);
    }
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showErrorToast("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !user) return;
    
    try {
      await uploadFile(selectedFile, "profileImage");
    } catch (error) {
      console.error("Upload failed:", error);
    }
  }, [selectedFile, user, uploadFile]);

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  if (!user) {
    return <div>Please sign in to upload images</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Profile Image</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer border-neutral/20 hover:border-neutral/40 bg-neutral/5 hover:bg-neutral/10">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-neutral-light" />
                <p className="mb-2 text-sm text-neutral-light">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-neutral-light">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileSelect}
              />
            </label>
          </div>

          {previewUrl && (
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-64 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-neutral-light">{progress}%</span>
              </div>
              <div className="w-full bg-neutral/10 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-danger p-2 bg-danger/5 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Image"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}