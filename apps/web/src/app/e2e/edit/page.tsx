"use client";
import { useState, Suspense } from "react";
import { updateUserProfile } from "@/lib/profile/userProfileApi";
import { auth } from "@/lib/firebase";
import { useSearchParams } from "next/navigation";

function EditProfileE2ETestPageInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "test-token";

  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState("idle");

  const handleSave = async () => {
    setStatus("loading");
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not signed in");
      const res = await updateUserProfile(uid, { fullName }, 0);
      setStatus(res.success ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Full name"
        className="border p-2 rounded w-64"
      />
      <button
        onClick={handleSave}
        disabled={status === "loading"}
        className="bg-primary text-base-light px-4 py-2 rounded"
      >
        Save
      </button>
      <div data-testid="status">{status}</div>
    </div>
  );
}

export default function EditProfileE2ETestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditProfileE2ETestPageInner />
    </Suspense>
  );
}
