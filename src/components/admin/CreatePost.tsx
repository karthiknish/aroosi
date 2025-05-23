import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon } from "lucide-react";
import { PexelsImageModal } from "@/components/PexelsImageModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { toast } from "sonner";
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
  setPexelsOpen: (value: boolean) => void;
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
  pexelsOpen,
  setPexelsOpen,
  markdownShortcuts,
  insertMarkdown,
  contentRef,
  convertToMarkdownWithGemini,
  slugify,
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

          <div>
            <label className="text-sm font-medium text-gray-700">Excerpt</label>
            <Input
              placeholder="Brief description of the post"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              disabled={creating}
              className="mt-1"
            />
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
