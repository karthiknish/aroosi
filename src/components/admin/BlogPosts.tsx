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
import {
  Image as ImageIcon,
  Edit,
  Trash2,
  Calendar,
  Clock,
} from "lucide-react";
import { PexelsImageModal } from "@/components/PexelsImageModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { toast } from "sonner";
import BlogEditor from "@/components/admin/BlogEditor";

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  categories?: string[];
}

interface BlogPostsProps {
  posts: BlogPost[] | undefined;
  editingPost: string | null;
  setEditingPost: (id: string | null) => void;
  editTitle: string;
  setEditTitle: (value: string) => void;
  editSlug: string;
  setEditSlug: (value: string) => void;
  editExcerpt: string;
  setEditExcerpt: (value: string) => void;
  editContent: string;
  setEditContent: (value: string) => void;
  editImageUrl: string;
  setEditImageUrl: (value: string) => void;
  editSlugManuallyEdited: boolean;
  setEditSlugManuallyEdited: (value: boolean) => void;
  editPexelsOpen: boolean;
  setEditPexelsOpen: (value: boolean) => void;
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
  editContentRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  convertToMarkdownWithGemini: (text: string) => Promise<string>;
  slugify: (str: string) => string;
  saveEdit: (id: string) => Promise<void>;
  cancelEdit: () => void;
  deletePost: (id: string) => void;
  editCategories: string[];
  setEditCategories: (value: string[]) => void;
}

export function BlogPosts({
  posts,
  editingPost,
  setEditingPost,
  editTitle,
  setEditTitle,
  editSlug,
  setEditSlug,
  editExcerpt,
  setEditExcerpt,
  editContent,
  setEditContent,
  editImageUrl,
  setEditImageUrl,
  editSlugManuallyEdited,
  setEditSlugManuallyEdited,
  editPexelsOpen,
  setEditPexelsOpen,
  markdownShortcuts,
  insertMarkdown,
  editContentRef,
  convertToMarkdownWithGemini,
  slugify,
  saveEdit,
  cancelEdit,
  deletePost,
  editCategories,
  setEditCategories,
}: BlogPostsProps) {
  const getReadingTime = (content: string) => {
    const words = content.split(/\s+/).length;
    return Math.ceil(words / 200); // Assuming 200 words per minute reading speed
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blog Posts</CardTitle>
        <CardDescription>Manage your blog content</CardDescription>
      </CardHeader>
      <CardContent>
        {posts === undefined ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No posts yet</div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post._id}
                className="p-4 bg-white rounded-lg border border-gray-200"
              >
                {editingPost === post._id ? (
                  <div className="space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <Input
                      value={editSlug}
                      onChange={(e) => {
                        setEditSlug(e.target.value);
                        setEditSlugManuallyEdited(true);
                      }}
                      placeholder="Slug (e.g. my-first-post)"
                    />
                    <Input
                      value={editExcerpt}
                      onChange={(e) => setEditExcerpt(e.target.value)}
                    />
                    <div className="flex gap-2 items-center">
                      <Input
                        value={editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        placeholder="Image URL (optional)"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="text-pink-600 border-pink-300"
                        onClick={() => setEditPexelsOpen(true)}
                      >
                        Search Image
                      </Button>
                    </div>
                    {editImageUrl && (
                      <img
                        src={editImageUrl}
                        alt="Preview"
                        className="h-32 rounded border mb-2"
                      />
                    )}
                    <Input
                      value={editCategories.join(", ")}
                      onChange={(e) =>
                        setEditCategories(
                          e.target.value
                            .split(",")
                            .map((c) => c.trim())
                            .filter(Boolean)
                        )
                      }
                      placeholder="Categories (comma separated)"
                      className="mb-2"
                    />
                    <div className="md:flex gap-6">
                      <div className="flex-1">
                        <div className="flex-1">
                          <BlogEditor
                            value={editContent}
                            onChange={setEditContent}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        className="bg-pink-600 hover:bg-pink-700"
                        onClick={() => saveEdit(post._id)}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getReadingTime(post.content)} min read
                        </div>
                      </div>
                      {post.categories && post.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {post.categories.map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs font-medium"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingPost(post._id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deletePost(post._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
