"use client";

import { useState, useRef } from "react";
import { createBlogPost } from "@/lib/blogUtil";
import { CreatePost } from "@/components/admin/CreatePost";
import { toast } from "sonner";
import { useAuthContext } from "@/components/AuthProvider";
import { PexelsImageModal } from "@/components/PexelsImageModal";
import type { BlogPost } from "@/types/blog";

export default function CreateBlogPage() {
  const { token } = useAuthContext();
  const [title, setTitle] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [excerpt, setExcerpt] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<boolean>(false);
  const [pexelsOpen, setPexelsOpen] = useState<boolean>(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

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
      if (!token) {
        throw new Error("Authentication required");
      }

      const res = await fetch("/api/convert-ai-text-to-html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, type: field }),
        cache: "no-store",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "AI processing failed");
      }

      const data = await res.json();

      // Extract plain text from HTML
      const temp = document.createElement("div");
      temp.innerHTML = data.html;
      const plain = temp.textContent || temp.innerText || "";
      return plain.trim();
    } catch (error) {
      console.error(`Error in AI ${field} generation:`, error);
      const message =
        error instanceof Error ? error.message : "AI processing failed";
      toast.error(message);
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
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch("/api/convert-markdown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, prompt }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to convert to markdown");
      }

      const data = await response.json();
      return data.markdown;
    } catch (error) {
      console.error("Error converting to markdown:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to convert to markdown"
      );
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

  const handleCreatePost = async () => {
    setCreating(true);
    setError(null);
    try {
      await createBlogPost(
        {
          title,
          slug,
          excerpt,
          content,
          imageUrl,
          categories: [],
        } as BlogPost,
        token
      );
      // Optionally reset form or redirect
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to create post");
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
            <span className="ml-4 text-blue-600 animate-pulse">
              Creating...
            </span>
          )}
        </div>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-200">
            {error}
          </div>
        )}
        <div className="my-8">
          <CreatePost
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
            categories={[]}
            setCategories={() => {}}
            aiLoading={{}}
            aiText={aiText}
            previewHtml={previewHtml}
            editorResetKey={editorResetKey}
          />
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
