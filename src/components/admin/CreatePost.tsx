import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon } from "lucide-react";
import BlogEditor from "@/components/admin/BlogEditor";

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
  previewHtml,
  pexelsOpen,
  setPexelsOpen,
}: CreatePostProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
        <CardDescription>Write and publish a new blog post</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <Input
                placeholder="Enter post title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugManuallyEdited) {
                    setSlug(slugify(e.target.value));
                  }
                }}
                disabled={creating}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Slug</label>
              <Input
                placeholder="my-first-post"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                disabled={creating}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <Input
              placeholder="Brief description of the post"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              disabled={creating}
              className="mt-1"
            />
            <Button
              type="button"
              variant="outline"
              className="text-pink-600 border-pink-300"
              onClick={async () => {
                const ai = await aiText(content, "excerpt");
                if (ai) setExcerpt(ai);
              }}
              disabled={aiLoading.excerpt}
            >
              {aiLoading.excerpt ? "AI..." : "AI"}
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <Input
              placeholder="Categories (comma separated)"
              value={categories.join(", ")}
              onChange={(e) =>
                setCategories(
                  e.target.value
                    .split(",")
                    .map((c) => c.trim())
                    .filter(Boolean)
                )
              }
              className="mb-2"
              disabled={creating}
            />
            <Button
              type="button"
              variant="outline"
              className="text-pink-600 border-pink-300"
              onClick={async () => {
                const ai = await aiText(content, "category");
                if (ai)
                  setCategories(
                    ai
                      .split(",")
                      .map((c: string) => c.trim())
                      .filter(Boolean)
                  );
              }}
              disabled={aiLoading.category}
            >
              {aiLoading.category ? "AI..." : "AI"}
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Featured Image
            </label>
            <div className="mt-1 flex gap-2">
              <Input
                placeholder="Image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={creating}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setPexelsOpen(true)}
                className="whitespace-nowrap"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Search Images
              </Button>
            </div>
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                className="mt-2 h-32 rounded-lg object-cover"
              />
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Content</label>
            <div className="mt-1">
              <BlogEditor value={content} onChange={setContent} />
            </div>
          </div>

          <div className="mt-6">
            <div className="font-semibold text-gray-700 mb-2">Live Preview</div>
            <div
              className="prose max-w-none bg-gray-50 border rounded-lg p-4 min-h-[120px]"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
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
