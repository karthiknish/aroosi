import React from "react";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ImageType } from "@/types/image";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";

interface Props {
  images: ImageType[];
  onImagesChanged: (images: ImageType[]) => void;
  onImageDelete: (imageId: string) => Promise<void>;
  onImageReorder: (newOrder: ImageType[]) => void;
  profileId: string;
  onNext?: () => void;
  onBack?: () => void;
}

const photoTips = [
  {
    icon: "📸",
    title: "Clear Face Shot",
    description: "Include at least one clear photo of your face",
    required: true,
  },
  {
    icon: "😊",
    title: "Genuine Smile",
    description: "Smiling photos get 40% more matches",
    required: false,
  },
  {
    icon: "🌟",
    title: "Variety",
    description: "Mix of close-up and full-body photos",
    required: false,
  },
  {
    icon: "🎯",
    title: "Recent Photos",
    description: "Photos from the last 2 years work best",
    required: true,
  },
  {
    icon: "👥",
    title: "Solo Shots",
    description: "Avoid group photos as your main image",
    required: false,
  },
];

export default function EnhancedImagesStep({
  images,
  onImagesChanged,
  onImageDelete,
  onImageReorder,
  profileId,
}: Props) {
  const getCompletionPercentage = () => {
    if (images.length === 0) return 0;
    if (images.length >= 1) return 40;
    if (images.length >= 3) return 70;
    if (images.length >= 5) return 100;
    return Math.min((images.length / 5) * 100, 100);
  };

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h3 className="text-xl font-semibold text-primary">
          Add your best photos
        </h3>
        <p className="text-muted-foreground">
          Great photos are key to making a good first impression. Upload at
          least one photo to continue.
        </p>

        {/* Progress */}
        <div className="max-w-md mx-auto">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Photo completion</span>
            <span>{Math.round(getCompletionPercentage())}%</span>
          </div>
          <div className="h-3 bg-primary/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${getCompletionPercentage()}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0 photos</span>
            <span>5+ photos</span>
          </div>
        </div>
      </motion.div>

      {/* Photo Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h4 className="text-lg font-semibold text-foreground">
              Photo Tips
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photoTips.map((tip, index) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className={cn(
                  "p-4 rounded-lg bg-background border",
                  tip.required ? "border-primary/20" : "border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tip.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium text-foreground">
                        {tip.title}
                      </h5>
                      {tip.required && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary text-xs"
                        >
                          Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tip.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Upload Area (replaced with ProfileImageUpload) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ProfileImageUpload
          userId={profileId}
          profileId={profileId}
          onImagesChanged={(newImages) => {
            if (Array.isArray(newImages) && typeof newImages[0] === "object") {
              onImagesChanged(newImages as ImageType[]);
            } else {
              onImagesChanged([]);
            }
          }}
          mode="create"
        />
      </motion.div>

      {/* Photo Gallery (replaced with ProfileImageReorder) */}
      {images.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ProfileImageReorder
            images={images}
            userId={profileId}
            onReorder={onImageReorder}
            onDeleteImage={onImageDelete}
          />
        </motion.div>
      )}

      {/* Completion Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className={cn(
          "rounded-lg p-4 border",
          images.length >= 1
            ? "bg-primary/5 border-primary/20"
            : "bg-background border-border"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
              images.length >= 1 ? "bg-primary" : "bg-background"
            )}
          >
            {images.length >= 1 ? (
              <CheckCircle className="w-3 h-3 text-white" />
            ) : (
              <span className="text-white text-xs font-bold">!</span>
            )}
          </div>
          <div
            className={cn(
              "text-sm",
              images.length >= 1 ? "text-primary" : "text-border"
            )}
          >
            <p className="font-medium mb-1">
              {images.length >= 1 ? "Photos Ready!" : "Photos Required"}
            </p>
            <p>
              {images.length >= 1
                ? `You have ${images.length} photo${images.length > 1 ? "s" : ""} uploaded. You can continue to the next step or add more photos.`
                : "Upload at least one photo to continue. More photos increase your chances of getting matches."}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
