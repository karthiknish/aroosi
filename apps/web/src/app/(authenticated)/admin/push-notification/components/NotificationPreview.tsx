import { useState } from "react";
import { Smartphone, Bell, Apple, Copy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const [platform, setPlatform] = useState<"ios" | "android">("ios");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral">
          <Smartphone className="h-4 w-4" />
          Preview
        </div>
        <Tabs
          value={platform}
          onValueChange={(v) => setPlatform(v as "ios" | "android")}
          className="w-[200px]"
        >
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="ios" className="text-xs">
              <Apple className="h-3 w-3 mr-1" /> iOS
            </TabsTrigger>
            <TabsTrigger value="android" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" /> Android
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
        <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
        <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
        <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
        <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
        <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
        
        {/* Screen Content */}
        <div className="rounded-[2rem] overflow-hidden w-full h-full bg-cover bg-center relative" 
             style={{ 
               backgroundImage: "url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop')",
               backgroundColor: "#333"
             }}>
          
          {/* Status Bar */}
          <div className="h-12 w-full flex justify-between items-center px-6 pt-2 text-white text-xs font-medium z-10 relative">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-3 bg-white/90 rounded-sm"></div>
              <div className="w-4 h-3 bg-white/90 rounded-sm"></div>
            </div>
          </div>

          {/* Notification Overlay */}
          <div className="absolute top-14 left-0 right-0 px-2 z-20">
            {platform === "ios" ? (
              /* iOS Style Notification */
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-lg text-left animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-primary rounded-md flex items-center justify-center">
                      <Bell className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-900 uppercase tracking-wide">AROOSI</span>
                  </div>
                  <span className="text-[10px] text-gray-500">now</span>
                </div>
                <div className="pr-2">
                  <h4 className="text-[13px] font-semibold text-gray-900 leading-tight mb-1">
                    {title || "Notification Title"}
                  </h4>
                  <p className="text-[13px] text-gray-700 leading-snug">
                    {message || "Notification message body goes here..."}
                  </p>
                </div>
                {imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden h-32 bg-gray-100 relative">
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500 text-xs">
                      Image Preview
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Android Style Notification */
              <div className="bg-white rounded-xl p-3 shadow-lg text-left animate-in slide-in-from-top-4 duration-500 mx-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-transparent flex items-center justify-center">
                    <Bell className="h-3 w-3 text-gray-500" />
                  </div>
                  <span className="text-[11px] text-gray-500">Aroosi • now</span>
                  <div className="ml-auto">
                     <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <h4 className="text-[14px] font-bold text-gray-900 leading-tight mb-1">
                      {title || "Notification Title"}
                    </h4>
                    <p className="text-[13px] text-gray-600 leading-snug">
                      {message || "Notification message body goes here..."}
                    </p>
                  </div>
                  {imageUrl && (
                    <div className="w-12 h-12 bg-gray-200 rounded-md flex-shrink-0 overflow-hidden">
                       <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500">IMG</div>
                    </div>
                  )}
                </div>
                {imageUrl && (
                   <div className="mt-2 w-full h-32 bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500">
                      Big Picture Style
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Card */}
      <Card className="bg-neutral/5 border-neutral/20">
        <CardContent className="p-4 space-y-3 text-xs text-neutral">
          <div className="flex justify-between border-b border-neutral/20 pb-2">
            <span className="font-medium">Audience Size</span>
            <span>{maxAudience.toLocaleString()} users (est)</span>
          </div>
          <div className="flex justify-between border-b border-neutral/20 pb-2">
            <span className="font-medium">Segments</span>
            <span className="text-right max-w-[150px] truncate">{segments.join(", ")}</span>
          </div>
          <div className="flex justify-between border-b border-neutral/20 pb-2">
            <span className="font-medium">Mode</span>
            <span className={dryRun ? "text-info font-medium" : "text-primary font-medium"}>
              {dryRun ? "Dry Run (Preview)" : "Live Production"}
            </span>
          </div>
          {url && (
            <div className="pt-1">
              <span className="font-medium block mb-1">Deep Link</span>
              <code className="bg-neutral/10 px-2 py-1 rounded block truncate text-neutral">
                {url}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {previewData && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm text-neutral-dark">Payload JSON</h4>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
              onClick={() => onCopy(JSON.stringify(previewData, null, 2))}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>
          <pre className="text-[10px] bg-neutral-darker text-base-light p-3 rounded-lg overflow-auto max-h-48 font-mono">
            {JSON.stringify(previewData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
