import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";
import React from "react";

interface BlogPostFieldsProps {
  title: string;
  setTitle: (value: string) => void;
  slug: string;
  setSlug: (value: string) => void;
  slugManuallyEdited: boolean;
  setSlugManuallyEdited: (value: boolean) => void;
  slugify: (str: string) => string;
  excerpt: string;
  setExcerpt: (value: string) => void;
  categories: string[];
  setCategories: (value: string[]) => void;
  imageUrl: string;
  setImageUrl: (value: string) => void;
  pexelsOpen: boolean;
  setPexelsOpen: (open: boolean) => void;
  aiLoading: { excerpt?: boolean; category?: boolean };
  aiText: (text: string, field: "excerpt" | "category") => Promise<string>;
  content: string;
  disabled?: boolean;
}

export const BlogPostFields: React.FC<BlogPostFieldsProps> = ({
  title,
  setTitle,
  slug,
  setSlug,
  slugManuallyEdited,
  setSlugManuallyEdited,
  slugify,
  excerpt,
  setExcerpt,
  categories,
  setCategories,
  imageUrl,
  setImageUrl,
  setPexelsOpen,
  aiLoading,
  aiText,
  content,
  disabled,
}) => {
  return (
    <>
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
            disabled={disabled}
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
            disabled={disabled}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">
          Excerpt <span className="text-primary">*</span>
        </label>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Short summary of the post"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="mb-2"
            required
          />
          <Button
            type="button"
            variant="outline"
            className="text-pink-600 border-pink-300"
            onClick={async () => {
              const ai = await aiText(content, "excerpt");
              if (ai) setExcerpt(ai);
            }}
            disabled={aiLoading.excerpt || disabled}
          >
            {aiLoading.excerpt ? "AI..." : "AI"}
          </Button>
        </div>
        {excerpt.trim() === "" && (
          <div className="text-xs text-red-500 mb-2">Excerpt is required.</div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">
          Categories <span className="text-primary">*</span>
        </label>
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
            required
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
            disabled={aiLoading.category || disabled}
          >
            {aiLoading.category ? "AI..." : "AI"}
          </Button>
        </div>
        {categories.length === 0 && (
          <div className="text-xs text-red-500 mb-2">
            At least one category is required.
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">
          Featured Image <span className="text-primary">*</span>
        </label>
        <div className="mt-1 flex gap-2">
          <Input
            placeholder="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={disabled}
            required
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setPexelsOpen(true)}
            className="whitespace-nowrap"
            disabled={disabled}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Search Images
          </Button>
        </div>
        {(!imageUrl || imageUrl.trim() === "") && (
          <div className="text-xs text-red-500 mb-2">
            Image URL is required.
          </div>
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Preview"
            className="mt-2 h-32 rounded-lg object-cover"
          />
        )}
      </div>
    </>
  );
};
