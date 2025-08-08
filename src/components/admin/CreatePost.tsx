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

interface CreatePostProps {
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
  creating: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  slugManuallyEdited: boolean;
  setSlugManuallyEdited: (value: boolean) => void;
  pexelsOpen: boolean;
  setPexelsOpen: (open: boolean) => void;
  markdownShortcuts: Array<{
    label: string;
    title: string;
    md: string;
    wrap?: string;
    block?: boolean;
  }>;
  insertMarkdown: (
    text: string,
    setText: (value: string) => void,
    ref: React.MutableRefObject<HTMLTextAreaElement | null>,
    md: string,
    wrap?: string,
    block?: boolean
  ) => void;
  contentRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  convertToMarkdownWithGemini: (text: string) => Promise<string>;
  slugify: (str: string) => string;
  categories: string[];
  setCategories: (value: string[]) => void;
  aiLoading: { excerpt?: boolean; category?: boolean; content?: boolean };
  aiText: (text: string, field: "excerpt" | "category") => Promise<string>;
  previewHtml: string;
  editorResetKey: number;
}

export function CreatePost({
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
  creating,
  error,
  onSubmit,
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
}: CreatePostProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
        <CardDescription>Write and publish a new blog post</CardDescription>
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
            disabled={creating}
          />
          <div>
            <label
              htmlFor="blog-content"
              className="text-sm font-medium text-gray-700"
            >
              Content
            </label>
            <div className="mt-1">
              <BlogEditor
                key={editorResetKey}
                value={content}
                onChange={setContent}
              />
              {/* Associate label via aria-labelledby since BlogEditor isn't a native control */}
              <textarea
                id="blog-content"
                aria-labelledby="blog-content-label"
                className="hidden"
                readOnly
                value={content}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-pink-600 hover:bg-pink-700"
              disabled={creating}
            >
              {creating ? "Creating..." : "Publish Post"}
            </Button>
          </div>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </form>
      </CardContent>
    </Card>
  );
}
