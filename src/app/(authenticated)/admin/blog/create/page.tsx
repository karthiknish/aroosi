"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createBlogPost,
  convertAiTextToHtml,
  convertTextToMarkdown,
} from "@/lib/blogUtil";
import { CreatePost } from "@/components/admin/CreatePost";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { PexelsImageModal } from "@/components/PexelsImageModal";
import { ErrorState } from "@/components/ui/error-state";
import { fetchBlogPostBySlug } from "@/lib/blogUtil";

export default function CreateBlogPage() {
  useAuthContext(); // maintain hook order; no token usage in cookie-auth
  const router = useRouter();
  const [title, setTitle] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [excerpt, setExcerpt] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<boolean>(false);
  const [pexelsOpen, setPexelsOpen] = useState<boolean>(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

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

  // Dummy implementations for missing variables and functions
  // Replace these with your actual implementations
  type MarkdownShortcut = {
    label: string;
    title: string;
    md: string;
    wrap?: string;
    block?: boolean;
  };
  const markdownShortcuts: MarkdownShortcut[] = [
    { label: "H1", title: "Heading 1", md: "# " },
    { label: "H2", title: "Heading 2", md: "## " },
    { label: "H3", title: "Heading 3", md: "### " },
    { label: "B", title: "Bold", md: "**", wrap: "**" },
    { label: "I", title: "Italic", md: "_", wrap: "_" },
    { label: "Link", title: "Link", md: "[", wrap: "](url)" },
    { label: "Img", title: "Image", md: "![alt](", wrap: ")" },
    { label: "Code", title: "Code", md: "```\n", wrap: "\n```", block: true },
    { label: "List", title: "List", md: "- ", block: true },
    {
      label: "Table",
      title: "Table",
      md: "| Header | Header |\n| ------ | ------ |\n| Cell | Cell |",
      block: true,
    },
  ];
  async function aiText(text: string, field: "excerpt" | "category") {
    try {
      // cookie-auth; server reads cookies
      return await convertAiTextToHtml({ text, type: field } as any);
    } catch (error) {
      console.error(`Error in AI ${field} generation:`, error);
      const message =
        error instanceof Error ? error.message : "AI processing failed";
      showErrorToast(message);
      return "";
    }
  }

  const insertMarkdown = (
    text: string,
    setText: (value: string) => void,
    ref: React.MutableRefObject<HTMLTextAreaElement | null>,
    md: string,
    wrap?: string,
    block?: boolean
  ) => {
    if (!ref.current) return;

    const start = ref.current.selectionStart ?? 0;
    const end = ref.current.selectionEnd ?? 0;
    const selectedText = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    let newText = text;
    if (wrap) {
      newText = before + md + selectedText + wrap + after;
    } else if (block) {
      const lines = text.split("\n");
      const currentLine = before.split("\n").length - 1;
      lines.splice(currentLine, 0, md);
      newText = lines.join("\n");
    } else {
      newText = before + md + after;
    }

    setText(newText);
    setTimeout(() => {
      if (ref.current) {
        const newCursorPos = wrap
          ? start + md.length + selectedText.length + wrap.length
          : start + md.length;
        ref.current.selectionStart = newCursorPos;
        ref.current.selectionEnd = newCursorPos;
        ref.current.focus();
      }
    }, 0);
  };
  const convertToMarkdownWithGemini = async (
    text: string,
    prompt?: string
  ): Promise<string> => {
    try {
      // cookie-auth
      return await convertTextToMarkdown({ text, prompt } as any);
    } catch (error) {
      console.error("Error converting to markdown:", error);
      showErrorToast(error, "Failed to convert to markdown");
      return text;
    }
  };

  const slugify = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const previewHtml = "";
  const editorResetKey = 0;

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    // Ensure form submission doesn't trigger a full page reload
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
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
      // Slug uniqueness check via Firestore-backed API
      const existing = await fetchBlogPostBySlug(slug);
      if (existing) {
        throw new Error("Slug already exists. Please choose a different slug.");
      }
      const categoriesArray: string[] = categories;
      const result = await createBlogPost("", {
        title,
        slug,
        excerpt,
        content,
        imageUrl,
        categories: categoriesArray,
      } as any);
      if (!result?.success) {
        const msg = result?.error || "Failed to create post";
        setError(msg);
        showErrorToast(msg);
        return;
      }
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
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to create post");
      showErrorToast(error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2 md:px-0 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6 md:p-10">
        <div className="mb-6 border-b pb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            Create New Blog Post
          </h1>
          {creating && (
            <span className="ml-4 text-pink-600 animate-pulse">
              Creating...
            </span>
          )}
        </div>
        {error && <ErrorState message={error} className="mb-4" />}
        <div className="my-8">
          <CreatePost
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
            creating={creating}
            error={error}
            onSubmit={handleCreatePost}
            slugManuallyEdited={slugManuallyEdited}
            setSlugManuallyEdited={setSlugManuallyEdited}
            pexelsOpen={pexelsOpen}
            setPexelsOpen={setPexelsOpen}
            markdownShortcuts={markdownShortcuts}
            insertMarkdown={insertMarkdown}
            contentRef={contentRef}
            convertToMarkdownWithGemini={convertToMarkdownWithGemini}
            slugify={slugify}
            categories={categories}
            setCategories={setCategories}
            aiLoading={{}}
            aiText={aiText}
            previewHtml={previewHtml}
            editorResetKey={editorResetKey}
          />
          {/* Live validation + info */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
            <div>Title: {title.trim().length}/120</div>
            <div>Excerpt: {excerpt.trim().length}/300</div>
            <div>Content: {content.trim().length} chars</div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-md border text-sm disabled:opacity-50"
            onClick={() => router.back()}
            disabled={creating}
          >
            Cancel
          </button>
        </div>
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
