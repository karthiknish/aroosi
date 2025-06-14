"use client";
import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function PremiumSettingsPage() {
  const { profile, token, refreshProfile } = useAuthContext();
  const [hideProfile, setHideProfile] = useState<boolean>(
    !!profile?.hideFromFreeUsers
  );
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  if (!profile) return null;

  const isPremium =
    profile.subscriptionPlan === "premium" ||
    profile.subscriptionPlan === "premiumPlus";

  // Redirect free users
  if (!isPremium) {
    if (typeof window !== "undefined") router.replace("/pricing");
    return null;
  }

  async function handleSave() {
    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hideFromFreeUsers: hideProfile }),
      });
      if (!res.ok) {
        throw new Error("Failed to update settings");
      }
      await refreshProfile();
      alert("Settings saved");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto pt-24 pb-12 px-4">
      <h1 className="text-3xl font-semibold mb-6">Premium Features</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">
              Hide profile from free users
            </h2>
            <p className="text-sm text-gray-500">
              Only premium members will be able to find and view your profile.
            </p>
          </div>
          <Switch checked={hideProfile} onCheckedChange={setHideProfile} />
        </div>
        <Button onClick={handleSave} disabled={saving} className="mt-4">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
