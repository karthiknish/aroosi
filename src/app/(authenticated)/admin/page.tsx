"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Mail } from "lucide-react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuthContext } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

function AdminPageInner() {
  const router = useRouter();
  const { isAdmin: userIsAdmin } = useAuthContext();

  if (!userIsAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!userIsAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            You do not have permission to access this page.
          </p>
          <Link
            href="/"
            className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-pink-700 mb-10 text-center">
          Admin Dashboard
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Blog Box */}
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => router.push("/admin/blog")}
          >
            <CardHeader className="flex flex-col items-center">
              <FileText className="w-10 h-10 text-pink-600 mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-xl font-semibold text-pink-800">
                Blog
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-gray-600">
              Manage, create, and edit blog posts for your site.
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full group-hover:bg-pink-50 group-hover:text-pink-700"
                  asChild
                >
                  <Link href="/admin/blog">Go to Blog</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Profiles Box */}
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => router.push("/admin/profile")}
          >
            <CardHeader className="flex flex-col items-center">
              <Users className="w-10 h-10 text-pink-600 mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-xl font-semibold text-pink-800">
                Profiles
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-gray-600">
              View and manage user profiles and admin accounts.
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full group-hover:bg-pink-50 group-hover:text-pink-700"
                  asChild
                >
                  <Link href="/admin/profile">Go to Profiles</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Contact Box */}
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => router.push("/admin/contact")}
          >
            <CardHeader className="flex flex-col items-center">
              <Mail className="w-10 h-10 text-pink-600 mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-xl font-semibold text-pink-800">
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-gray-600">
              Review and respond to contact form messages from users.
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full group-hover:bg-pink-50 group-hover:text-pink-700"
                  asChild
                >
                  <Link href="/admin/contact">Go to Contact</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Admin page with proper authentication and caching
function AdminPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, isAdmin } = useAuthContext();

  // Redirect if not admin or not loaded yet
  useEffect(() => {
    if (isLoaded && (!isSignedIn || !isAdmin)) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, isAdmin, router]);

  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // If not signed in or not admin, show nothing (will be redirected)
  if (!isSignedIn || !isAdmin) {
    return null;
  }

  return (
    <>
      <AdminPageInner />
    </>
  );
}

export default AdminPage;
