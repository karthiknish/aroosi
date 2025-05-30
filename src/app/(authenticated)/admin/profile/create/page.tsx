"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useToken } from "@/components/TokenProvider";
import ProfileForm from "@/components/profile/ProfileForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminCreateProfilePage() {
  const router = useRouter();
  const token = useToken();

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile Management
          </Button>
        </div>
        <ProfileForm
          mode="create"
          onSubmit={async (values) => {
            try {
              const response = await fetch("/api/profile", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(values),
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create profile");
              }

              toast.success("Profile created successfully");
              router.push("/admin");
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to create profile"
              );
            }
          }}
          onEditDone={() => router.back()}
        />
      </div>
    </div>
  );
}
