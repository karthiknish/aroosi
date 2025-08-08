"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { BlogPostFields } from "@/components/admin/BlogPostFields";
import BlogEditor from "@/components/admin/BlogEditor";
import { useAuthContext } from "@/components/AuthProvider";
import { fetchBlogPostBySlug, editBlogPost } from "@/lib/blogUtil";
import type { BlogPost } from "@/types/blog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PexelsImageModal } from "@/components/PexelsImageModal";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Note: All admin blog routes now rely on cookie-based auth.
 * Token parameters to util functions are passed as empty string shims where required by types,
 * while the server reads HttpOnly cookies.
 */
function AdminEditBlogPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slugParam = searchParams.get("slug");
  const { isAdmin, isLoaded, isSignedIn } = useAuthContext();

  // Fetch blog post
  const { data: blogPost, isLoading } = useQuery<BlogPost | null>({
    queryKey: ["blogPost", slugParam],
    queryFn: async () => {
      if (!slugParam) return null;
      return fetchBlogPostBySlug(slugParam, undefined);
    },
    enabled: !!slugParam,
  });

  // Form state
  const [title, setTitle] = useState<string | undefined>();
  const [slug, setSlug] = useState<string | undefined>();
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [excerpt, setExcerpt] = useState<string | undefined>();
  const [categories, setCategories] = useState<string[] | undefined>();
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [pexelsOpen, setPexelsOpen] = useState(false);
  const [content, setContent] = useState<string | undefined>();
  const [aiLoading, setAiLoading] = useState<{
    excerpt?: boolean;
    category?: boolean;
  }>({});

  // Populate form when blogPost loads, but only if state is still undefined
  useEffect(() => {
    if (blogPost && title === undefined) {
      setTitle(blogPost.title || "");
      setSlug(blogPost.slug || "");
      setExcerpt(blogPost.excerpt || "");
      setCategories(blogPost.categories || []);
      setImageUrl(blogPost.imageUrl || "");
      setContent(blogPost.content || "");
    }
  }, [blogPost, title]);

  // Slugify helper
  const slugify = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  // AI text helper (stub)
  const aiText = useCallback(
    async (text: string, field: "excerpt" | "category") => {
      setAiLoading((prev) => ({ ...prev, [field]: true }));
      // TODO: Implement AI text generation if needed
      setAiLoading((prev) => ({ ...prev, [field]: false }));
      return text;
    },
    []
  );

  // Mutation for saving
  const { mutate: saveEdit, isPending: saving } = useMutation({
    mutationFn: async () => {
      if (!blogPost?._id) throw new Error("Missing id");
      const updates = {
        title,
        slug,
        excerpt,
        categories,
        imageUrl,
        content,
      };
      const result = await editBlogPost("", blogPost._id, updates as any);
      if (!result.success)
        throw new Error(result.error || "Failed to update post");
      return result.data;
    },
    onSuccess: () => {
      showSuccessToast("Blog post updated successfully!");
      router.push("/admin");
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        showErrorToast(err, "Failed to update post");
      } else {
        showErrorToast(null, "Failed to update post");
      }
    },
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!isSignedIn || !isAdmin) {
    return (
      <ErrorState
        message="You must be an admin to view this page."
        className="min-h-screen"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!blogPost) {
    return (
      <EmptyState message="Blog post not found." className="min-h-screen" />
    );
  }

  return (
    <div className="min-h-screen my-8 bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 border border-pink-200">
        <h2 className="text-2xl font-bold mb-6 text-pink-700">
          Edit Blog Post
        </h2>
        {blogPost && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveEdit();
            }}
          >
            <BlogPostFields
              title={title ?? ""}
              setTitle={setTitle}
              slug={slug ?? ""}
              setSlug={setSlug}
              slugManuallyEdited={slugManuallyEdited}
              setSlugManuallyEdited={setSlugManuallyEdited}
              slugify={slugify}
              excerpt={excerpt ?? ""}
              setExcerpt={setExcerpt}
              categories={categories ?? []}
              setCategories={setCategories}
              imageUrl={imageUrl ?? ""}
              setImageUrl={setImageUrl}
              pexelsOpen={pexelsOpen}
              setPexelsOpen={setPexelsOpen}
              aiLoading={aiLoading}
              aiText={aiText}
              content={content ?? ""}
              disabled={saving}
            />
            <div
              className="mt-6"
              role="group"
              aria-labelledby="blog-content-label"
            >
              <label
                id="blog-content-label"
                className="text-sm font-medium text-gray-700 mb-2 block"
                htmlFor="blog-content-editor"
              >
                Content
              </label>
              <BlogEditor
                value={content ?? ""}
                onChange={setContent}
                aria-labelledby="blog-content-label"
              />
            </div>
            <div className="flex gap-2 mt-8">
              <button
                type="submit"
                className="bg-pink-600 hover:bg-pink-700 text-white font-semibold px-6 py-2 rounded shadow"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="border border-pink-300 text-pink-600 font-semibold px-6 py-2 rounded shadow bg-white hover:bg-pink-50"
                onClick={() => router.push("/admin")}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="border border-gray-300 text-gray-600 font-semibold px-6 py-2 rounded shadow bg-white hover:bg-gray-50"
                onClick={() => {
                  setTitle(blogPost.title || "");
                  setSlug(blogPost.slug || "");
                  setExcerpt(blogPost.excerpt || "");
                  setCategories(blogPost.categories || []);
                  setImageUrl(blogPost.imageUrl || "");
                  setContent(blogPost.content || "");
                  setSlugManuallyEdited(false);
                }}
                disabled={saving}
                style={{ marginLeft: "auto" }}
                title="Reset form to loaded blog post values"
              >
                Reset
              </button>
            </div>
          </form>
        )}
      </div>

      <PexelsImageModal
        isOpen={pexelsOpen}
        onClose={() => setPexelsOpen(false)}
        onSelect={(url: string) => {
          setImageUrl(url);
          setPexelsOpen(false);
        }}
      />
    </div>
  );
}

export default function AdminEditBlogPage() {
  return (
    <Suspense fallback={<LoadingSpinner size={32} />}>
      <AdminEditBlogPageInner />
    </Suspense>
  );
}
