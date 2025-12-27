"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminBlogAPI } from "@/lib/api/admin/blog";
import { PostForm } from "@/components/admin/PostForm";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { PexelsImageModal } from "@/components/PexelsImageModal";
import { ErrorState } from "@/components/ui/error-state";
import { useBlogAI } from "@/hooks/useBlogAI";
import { useMutation } from "@tanstack/react-query";

export default function CreateBlogPage() {
  useAuthContext(); // maintain hook order; no token usage in cookie-auth
  const router = useRouter();
  const [title, setTitle] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [excerpt, setExcerpt] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<boolean>(false);
  const [pexelsOpen, setPexelsOpen] = useState<boolean>(false);

  const slugify = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // Auto-generate slug from title if user hasn't manually edited it
  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slugManuallyEdited) {
      setSlug(slugify(v));
    }
  };
  const onSlugChange = (v: string) => {
    setSlug(v);
    setSlugManuallyEdited(true);
  };

  const { aiLoading, aiText } = useBlogAI({
    title,
    slug,
    excerpt,
    categories,
    content,
  });

  const editorResetKey = 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      // Basic client validation
      if (
        !title.trim() ||
        !slug.trim() ||
        !excerpt.trim() ||
        !content.trim() ||
        !imageUrl.trim()
      ) {
        throw new Error("Please fill in all required fields.");
      }

      // Slug uniqueness check
      const existing = await adminBlogAPI.get(slug);
      if (existing) {
        throw new Error("Slug already exists. Please choose a different slug.");
      }

      return adminBlogAPI.create({
        title,
        slug,
        excerpt,
        content,
        imageUrl,
        categories,
      });
    },
    onSuccess: () => {
      showSuccessToast("Post created successfully");
      // reset
      setTitle("");
      setSlug("");
      setExcerpt("");
      setContent("");
      setImageUrl("");
      setCategories([]);
      // navigate optimistically to the new post page
      router.push(`/blog/${encodeURIComponent(slug)}`);
    },
    onError: (err: Error) => {
      setError(err.message);
      showErrorToast(err, "Failed to create post");
    },
  });

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  };

  return (
    <>
      {error && (
        <div className="max-w-5xl mx-auto px-6 pt-6">
          <ErrorState message={error} />
        </div>
      )}
      <PostForm
        mode="create"
        title={title}
        setTitle={onTitleChange}
        slug={slug}
        setSlug={onSlugChange}
        excerpt={excerpt}
        setExcerpt={setExcerpt}
        content={content}
        setContent={setContent}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        isSubmitting={createMutation.isPending}
        error={error}
        onSubmit={handleCreatePost}
        onCancel={() => router.back()}
        slugManuallyEdited={slugManuallyEdited}
        setSlugManuallyEdited={setSlugManuallyEdited}
        pexelsOpen={pexelsOpen}
        setPexelsOpen={setPexelsOpen}
        slugify={slugify}
        categories={categories}
        setCategories={setCategories}
        aiLoading={aiLoading}
        aiText={aiText}
        editorResetKey={editorResetKey}
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
