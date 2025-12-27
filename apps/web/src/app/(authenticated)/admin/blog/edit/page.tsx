"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { PostForm } from "@/components/admin/PostForm";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { fetchBlogPostBySlug, editBlogPost } from "@/lib/blogUtil";
import type { BlogPost } from "@/types/blog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PexelsImageModal } from "@/components/PexelsImageModal";
import { ErrorState } from "@/components/ui/error-state";
import { Empty, EmptyIcon, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { useBlogAI } from "@/hooks/useBlogAI";
import { FileQuestion } from "lucide-react";

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
  const [title, setTitle] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [excerpt, setExcerpt] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [pexelsOpen, setPexelsOpen] = useState(false);
  const [content, setContent] = useState<string>("");

  // Populate form when blogPost loads
  useEffect(() => {
    if (blogPost) {
      setTitle(blogPost.title || "");
      setSlug(blogPost.slug || "");
      setExcerpt(blogPost.excerpt || "");
      setCategories(blogPost.categories || []);
      setImageUrl(blogPost.imageUrl || "");
      setContent(blogPost.content || "");
    }
  }, [blogPost]);

  // Slugify helper
  const slugify = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  const { aiLoading, aiText } = useBlogAI({
    title,
    slug,
    excerpt,
    categories,
    content,
  });

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
      router.push("/admin/blog");
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
      <Empty className="min-h-screen">
        <EmptyIcon icon={FileQuestion} />
        <EmptyTitle>Blog post not found</EmptyTitle>
        <EmptyDescription>
          The blog post you are trying to edit could not be found. It may have been deleted.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <>
      <PostForm
        mode="edit"
        title={title}
        setTitle={setTitle}
        slug={slug}
        setSlug={setSlug}
        excerpt={excerpt}
        setExcerpt={setExcerpt}
        content={content}
        setContent={setContent}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        isSubmitting={saving}
        error={null}
        onSubmit={async (e) => {
          e.preventDefault();
          saveEdit();
        }}
        onCancel={() => router.back()}
        onReset={() => {
          if (blogPost) {
            setTitle(blogPost.title || "");
            setSlug(blogPost.slug || "");
            setExcerpt(blogPost.excerpt || "");
            setCategories(blogPost.categories || []);
            setImageUrl(blogPost.imageUrl || "");
            setContent(blogPost.content || "");
            setSlugManuallyEdited(false);
          }
        }}
        slugManuallyEdited={slugManuallyEdited}
        setSlugManuallyEdited={setSlugManuallyEdited}
        pexelsOpen={pexelsOpen}
        setPexelsOpen={setPexelsOpen}
        slugify={slugify}
        categories={categories}
        setCategories={setCategories}
        aiLoading={aiLoading}
        aiText={aiText}
      />

      <PexelsImageModal
        isOpen={pexelsOpen}
        onClose={() => setPexelsOpen(false)}
        onSelect={(url: string) => {
          setImageUrl(url);
          setPexelsOpen(false);
        }}
      />
    </>
  );
}

export default function AdminEditBlogPage() {
  return (
    <Suspense fallback={<LoadingSpinner size={32} />}>
      <AdminEditBlogPageInner />
    </Suspense>
  );
}
