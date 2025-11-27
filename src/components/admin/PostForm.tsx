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
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Create New Post" : "Edit Blog Post"}
        </CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Write and publish a new blog post"
            : "Update existing blog post details"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
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
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="blog-content"
                className="text-sm font-medium text-neutral-dark"
              >
                Content
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-primary border-primary/30"
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
                {aiLoading?.content ? "Generating Content..." : "Generate with AI"}
              </Button>
            </div>
            <div className="mt-1 border rounded-md overflow-hidden">
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
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            {onReset && (
              <Button
                type="button"
                variant="outline"
                onClick={onReset}
                disabled={isSubmitting}
                className="mr-auto"
              >
                Reset
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-pink-600 hover:bg-pink-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                ? "Publish Post"
                : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
