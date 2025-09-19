import { Smartphone, Bell } from "lucide-react";

interface NotificationPreviewProps {
  title: string;
  message: string;
  imageUrl?: string;
  segments: string[];
  maxAudience: number;
  dryRun: boolean;
  url?: string;
  previewData?: any;
  onCopy: (text: string) => void;
}

export function NotificationPreview({
  title,
  message,
  imageUrl,
  segments,
  maxAudience,
  dryRun,
  url,
  previewData,
  onCopy,
}: NotificationPreviewProps) {
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-600">
          Notification Preview
        </span>
      </div>

      {/* Mobile notification mockup */}
      <div className="bg-white rounded-lg shadow-md p-3 max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bell className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-900">Aroosi</span>
              <span className="text-xs text-gray-500">now</span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 leading-tight mb-1">
              {title || "Your notification title"}
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              {message || "Your notification message will appear here"}
            </p>
            {imageUrl && (
              <div className="mt-2 rounded bg-gray-100 h-16 flex items-center justify-center text-xs text-gray-500">
                🖼️ Image: {imageUrl.split("/").pop()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-4 space-y-2 text-xs text-gray-600">
        <div>
          <strong>Audience:</strong> {segments.join(", ")} (max{" "}
          {maxAudience.toLocaleString()})
        </div>
        {url && (
          <div>
            <strong>Action URL:</strong> {url}
          </div>
        )}
        <div>
          <strong>Mode:</strong> {dryRun ? "Preview only" : "Live send"}
        </div>
      </div>
    </div>
  );
}
