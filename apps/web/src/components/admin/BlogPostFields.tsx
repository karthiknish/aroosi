import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Sparkles, X } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

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
  aiLoading: {
    excerpt?: boolean;
    category?: boolean;
    title?: boolean;
    content?: boolean;
  };
  aiText: (
    text: string,
    field: "excerpt" | "category" | "title" | "content"
  ) => Promise<string>;
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
  // Preserve user-entered whitespace while typing; trimming will be done at submit time
  const stripTags = (s: string) => s.replace(/<[^>]*>/g, "");
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label
            htmlFor="blog-title"
            className="text-sm font-medium text-neutral-700 flex items-center justify-between"
          >
            Title
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-primary hover:text-primary-dark hover:bg-primary/5"
              onClick={async () => {
                const ai = await aiText(
                  `${content}\n\nCurrent slug: ${slug}\nCategories: ${categories.join(", ")}`,
                  "title"
                );
                if (ai) {
                  setTitle(ai);
                  if (!slugManuallyEdited) {
                    setSlug(slugify(ai));
                  }
                }
              }}
              disabled={aiLoading.title || disabled}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {aiLoading.title ? "Generating..." : "Generate Title"}
            </Button>
          </label>
          <Input
            id="blog-title"
            placeholder="Enter an engaging post title"
            value={title}
            onChange={(e) => {
              const val = stripTags(e.target.value);
              setTitle(val);
              if (!slugManuallyEdited) {
                setSlug(slugify(val));
              }
            }}
            disabled={disabled}
            className="h-11 bg-white border-neutral-200 focus:border-primary focus:ring-primary/20"
          />
        </div>
        
        <div className="space-y-2">
          <label
            htmlFor="blog-slug"
            className="text-sm font-medium text-neutral-700"
          >
            Slug (URL)
          </label>
          <div className="relative">
            <Input
              id="blog-slug"
              placeholder="my-first-post"
              value={slug}
              onChange={(e) => {
                setSlug(stripTags(e.target.value).trim());
                setSlugManuallyEdited(true);
              }}
              disabled={disabled}
              className="h-11 bg-neutral-50 border-neutral-200 text-neutral-600 font-mono text-sm"
            />
            {slug && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">
                /blog/{slug}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="blog-excerpt"
          className="text-sm font-medium text-neutral-700 flex items-center justify-between"
        >
          <span>Excerpt <span className="text-red-500">*</span></span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-primary hover:text-primary-dark hover:bg-primary/5"
            onClick={async () => {
              const ai = await aiText(content, "excerpt");
              if (ai) setExcerpt(ai);
            }}
            disabled={aiLoading.excerpt || disabled}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {aiLoading.excerpt ? "Generating..." : "Generate Excerpt"}
          </Button>
        </label>
        <Input
          id="blog-excerpt"
          placeholder="A short summary that appears in search results and cards"
          value={excerpt}
          onChange={(e) => setExcerpt(stripTags(e.target.value))}
          className="h-11 bg-white border-neutral-200 focus:border-primary focus:ring-primary/20"
          required
        />
        {excerpt.trim() === "" && (
          <p className="text-xs text-red-500 mt-1">Excerpt is required.</p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="blog-categories"
          className="text-sm font-medium text-neutral-700 flex items-center justify-between"
        >
          <span>Categories <span className="text-red-500">*</span></span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-primary hover:text-primary-dark hover:bg-primary/5"
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
            <Sparkles className="w-3 h-3 mr-1" />
            {aiLoading.category ? "Generating..." : "Suggest Categories"}
          </Button>
        </label>
        <Input
          id="blog-categories"
          placeholder="Relationship, Marriage, Advice (comma separated)"
          value={categories.join(", ")}
          onChange={(e) =>
            setCategories(
              stripTags(e.target.value)
                .split(",")
                .map((c) => stripTags(c).trim())
                .filter(Boolean)
            )
          }
          className="h-11 bg-white border-neutral-200 focus:border-primary focus:ring-primary/20"
          required
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {categories.map((cat, i) => (
            <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <label
          htmlFor="blog-image-url"
          className="text-sm font-medium text-neutral-700 block"
        >
          Featured Image <span className="text-red-500">*</span>
        </label>
        
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1 w-full">
            <div className="flex gap-2">
              <Input
                id="blog-image-url"
                placeholder="https://images.pexels.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={disabled}
                required
                className="h-11 bg-white border-neutral-200 focus:border-primary focus:ring-primary/20 font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setPexelsOpen(true)}
                className="h-11 px-4 whitespace-nowrap border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900"
                disabled={disabled}
              >
                <ImageIcon className="w-4 h-4 mr-2 text-neutral-500" />
                Search Pexels
              </Button>
            </div>
            
            {(!imageUrl || imageUrl.trim() === "") && (
              <p className="text-xs text-red-500 mt-1">Image URL is required.</p>
            )}
            {imageUrl && !/^https?:\/\/(images\.)?pexels\.com\//.test(imageUrl) && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Recommendation: Use Pexels for best compatibility.
              </p>
            )}
          </div>

          {/* Image Preview Card */}
          <div className={cn(
            "w-full md:w-64 aspect-video rounded-xl border-2 border-dashed border-neutral-200 flex items-center justify-center overflow-hidden bg-neutral-50 relative group transition-all",
            imageUrl ? "border-solid border-neutral-200 shadow-sm" : ""
          )}>
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="text-center p-4">
                <ImageIcon className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <span className="text-xs text-neutral-400">No image selected</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
