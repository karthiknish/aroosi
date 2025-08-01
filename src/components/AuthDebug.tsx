"use client";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";

export default function AuthDebug() {
  const auth = useAuth();
  const [cookieInfo, setCookieInfo] = useState<string>("");

  useEffect(() => {
    // Get all cookies for debugging
    setCookieInfo(document.cookie || "No cookies found");
  }, []);

  useEffect(() => {
    console.log("=== AUTH DEBUG FULL STATE ===");
    console.log("isLoading:", auth.isLoading);
    console.log("isLoaded:", auth.isLoaded);
    console.log("isAuthenticated:", auth.isAuthenticated);
    console.log("user:", auth.user);
    console.log("token:", auth.token);
    console.log("error:", auth.error);
    console.log("cookies:", cookieInfo);
    console.log("localStorage token:", localStorage.getItem("auth-token"));
    console.log("=============================");
  }, [auth, cookieInfo]);

  const testApiCall = async () => {
    try {
      console.log("🧪 Testing /api/auth/me call...");
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      console.log("API Response:", { status: response.status, data });
    } catch (error) {
      console.error("API Error:", error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded text-xs max-w-md overflow-auto max-h-96 z-50">
      <h3 className="font-bold text-yellow-400 mb-2">🔍 Auth Debug Panel</h3>

      <div className="space-y-1">
        <div>
          Loading:{" "}
          <span className={auth.isLoading ? "text-red-400" : "text-green-400"}>
            {auth.isLoading ? "Yes" : "No"}
          </span>
        </div>
        <div>
          Loaded:{" "}
          <span className={auth.isLoaded ? "text-green-400" : "text-red-400"}>
            {auth.isLoaded ? "Yes" : "No"}
          </span>
        </div>
        <div>
          Authenticated:{" "}
          <span
            className={auth.isAuthenticated ? "text-green-400" : "text-red-400"}
          >
            {auth.isAuthenticated ? "Yes" : "No"}
          </span>
        </div>
        <div>
          User ID:{" "}
          <span className="text-blue-400">{auth.user?.id || "None"}</span>
        </div>
        <div>
          Token:{" "}
          <span className="text-blue-400">
            {auth.token ? auth.token.substring(0, 10) + "..." : "None"}
          </span>
        </div>
        <div>
          Error: <span className="text-red-400">{auth.error || "None"}</span>
        </div>
      </div>

      <hr className="my-2 border-gray-600" />

      <div className="space-y-1 text-xs">
        <div>
          Cookies:{" "}
          <span className="text-gray-400">
            {cookieInfo.substring(0, 50)}...
          </span>
        </div>
        <div>
          LocalStorage:{" "}
          <span className="text-gray-400">
            {localStorage.getItem("auth-token")?.substring(0, 20) || "None"}
          </span>
        </div>
      </div>

      <button
        onClick={testApiCall}
        className="mt-2 bg-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-700"
      >
        Test API Call
      </button>
    </div>
  );
}
