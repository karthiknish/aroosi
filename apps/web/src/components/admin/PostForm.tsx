import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BlogEditor from "@/components/admin/BlogEditor";
import { BlogPostFields } from "@/components/admin/BlogPostFields";

interface PostFormProps {
  mode: "create" | "edit";
  title: string;
  setTitle: (value: string) => void;
  slug: string;
  setSlug: (value: string) => void;
  excerpt: string;
  setExcerpt: (value: string) => void;
  content: string;
  setContent: (value: string) => void;
  imageUrl: string;
  setImageUrl: (value: string) => void;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
  onReset?: () => void;
  slugManuallyEdited: boolean;
  setSlugManuallyEdited: (value: boolean) => void;
  pexelsOpen: boolean;
  setPexelsOpen: (open: boolean) => void;
  slugify: (str: string) => string;
  categories: string[];
  setCategories: (value: string[]) => void;
  aiLoading: {
    excerpt?: boolean;
    category?: boolean;
    content?: boolean;
    title?: boolean;
  };
  aiText: (
    text: string,
    field: "excerpt" | "category" | "title" | "content"
  ) => Promise<string>;
  editorResetKey?: number;
}

export function PostForm({
  mode,
  title,
  setTitle,
  slug,
  setSlug,
  excerpt,
  setExcerpt,
  content,
  setContent,
  imageUrl,
  setImageUrl,
  isSubmitting,
  error,
  onSubmit,
  onCancel,
  onReset,
  slugManuallyEdited,
  setSlugManuallyEdited,
  slugify,
  categories,
  setCategories,
  aiLoading,
  aiText,
  pexelsOpen,
  setPexelsOpen,
  editorResetKey,
}: PostFormProps) {
  return (
    <div className="space-y-8 pb-24">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-neutral-dark">
          {mode === "create" ? "Create New Post" : "Edit Blog Post"}
        </h1>
        <p className="text-neutral-dark/70">
          {mode === "create"
            ? "Write and publish a new blog post for your audience."
            : "Update existing blog post details and content."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Basic Details Section */}
        <div className="bg-base-light rounded-2xl shadow-sm border border-neutral/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral/5 bg-neutral/5">
            <h2 className="text-lg font-semibold text-neutral-dark">
              Basic Details
            </h2>
          </div>
          <div className="p-6">
            <BlogPostFields
              title={title}
              setTitle={setTitle}
              slug={slug}
              setSlug={setSlug}
              slugManuallyEdited={slugManuallyEdited}
              setSlugManuallyEdited={setSlugManuallyEdited}
              slugify={slugify}
              excerpt={excerpt}
              setExcerpt={setExcerpt}
              categories={categories}
              setCategories={setCategories}
              imageUrl={imageUrl}
              setImageUrl={setImageUrl}
              pexelsOpen={pexelsOpen}
              setPexelsOpen={setPexelsOpen}
              aiLoading={aiLoading}
              aiText={aiText}
              content={content}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-base-light rounded-2xl shadow-sm border border-neutral/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral/5 bg-neutral/5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-dark">
              Content
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-primary border-primary/20 hover:bg-primary/5 hover:text-primary-dark"
              disabled={isSubmitting || aiLoading?.content}
              onClick={async () => {
                const context = [
                  title ? `Title: ${title}` : "",
                  excerpt ? `Excerpt: ${excerpt}` : "",
                  categories?.length
                    ? `Categories: ${categories.join(", ")}`
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n\n");
                const html = await aiText(context, "content");
                if (html) setContent(html);
              }}
            >
              {aiLoading?.content ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Generating...
                </span>
              ) : (
                "Generate with AI"
              )}
            </Button>
          </div>
          <div className="p-0">
            <BlogEditor
              key={editorResetKey}
              value={content}
              onChange={setContent}
            />
            {/* Hidden textarea for accessibility/form submission if needed */}
            <textarea
              id="blog-content"
              aria-labelledby="blog-content-label"
              className="hidden"
              readOnly
              value={content}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-danger/10 border border-danger/30 text-danger rounded-xl text-sm flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        {/* Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-base-light/80 backdrop-blur-xl border-t border-neutral/10 z-40 py-4 px-4 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="max-w-4xl mx-auto flex justify-end gap-3">
            {onReset && (
              <Button
                type="button"
                variant="ghost"
                onClick={onReset}
                disabled={isSubmitting}
                className="mr-auto text-neutral-dark/60 hover:text-neutral-dark"
              >
                Reset Form
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="min-w-[100px] rounded-full border-neutral/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="min-w-[140px] rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-white font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === "create" ? "Creating..." : "Saving..."}
                </span>
              ) : mode === "create" ? (
                "Publish Post"
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
