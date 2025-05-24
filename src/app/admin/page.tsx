"use client";

import { useState, useRef, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
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
import { Image as ImageIcon, Settings, Heading1, Heading2 } from "lucide-react";
import { PexelsImageModal } from "@/components/PexelsImageModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { toast } from "sonner";
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import { Sidebar } from "@/components/admin/Sidebar";
import { ContactMessages } from "@/components/admin/ContactMessages";
import { BlogPosts } from "@/components/admin/BlogPosts";
import { CreatePost } from "@/components/admin/CreatePost";
import { ProfileManagement } from "@/components/admin/ProfileManagement";
import { api } from "@convex/_generated/api";
import {
  useQuery as useConvexQuery,
  useMutation as useConvexMutation,
} from "convex/react";
import Head from "next/head";
import { motion } from "framer-motion";
import { Id } from "@/../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";

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

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

// Create a QueryClient instance outside the component to avoid recreation on every render
const queryClient = new QueryClient();

function AdminPageInner() {
  const [activeTab, setActiveTab] = useState<string>("contact");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editSlug, setEditSlug] = useState<string>("");
  const [editExcerpt, setEditExcerpt] = useState<string>("");
  const [editContent, setEditContent] = useState<string>("");
  const [editImageUrl, setEditImageUrl] = useState<string>("");
  const [editSlugManuallyEdited, setEditSlugManuallyEdited] =
    useState<boolean>(false);
  const [editPexelsOpen, setEditPexelsOpen] = useState<boolean>(false);
  const editContentRef = useRef<HTMLTextAreaElement>(null);

  const queryClientInstance = useQueryClient();

  const [adminError, setAdminError] = useState<string | null>(null);
  const { isLoaded, isSignedIn, user } = useAuth();

  // Wait for Clerk to be ready before making admin queries
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-600" />
        <span className="ml-4 text-pink-600 font-semibold">
          Loading authentication...
        </span>
      </div>
    );
  }
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 text-red-700 p-4 rounded shadow max-w-xl mx-auto text-center">
          <strong>Error:</strong> You must be signed in as an admin to view this
          page.
        </div>
      </div>
    );
  }

  // Fetch blog posts and contact messages from Convex
  const blogPostsRaw = useConvexQuery(api.blog.listBlogPosts, {});
  const contactMessagesRaw = useConvexQuery(api.contact.contactSubmissions, {});

  useEffect(() => {
    if (
      blogPostsRaw &&
      (blogPostsRaw as any).error &&
      /not authorized/i.test((blogPostsRaw as any).error.message)
    ) {
      setAdminError(
        "You are not authorized to view this page. Please log in as an admin."
      );
    }
  }, [blogPostsRaw]);

  // Map Convex data to expected types
  const blogPosts = blogPostsRaw?.map((post) => ({
    ...post,
    createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : "",
    updatedAt: post.updatedAt ? new Date(post.updatedAt).toISOString() : "",
  }));
  const contactMessages = contactMessagesRaw?.map((msg) => ({
    ...msg,
    createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : "",
  }));

  // Convex blog mutations
  const createBlogPost = useConvexMutation(api.blog.createBlogPost);
  const updateBlogPost = useConvexMutation(api.blog.updateBlogPost);
  const deleteBlogPost = useConvexMutation(api.blog.deleteBlogPost);

  const [categories, setCategories] = useState<string[]>([]);
  const [editCategories, setEditCategories] = useState<string[]>([]);

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await createBlogPost({
        title,
        slug,
        excerpt,
        content,
        imageUrl,
        categories,
      });
      setTitle("");
      setSlug("");
      setExcerpt("");
      setContent("");
      setImageUrl("");
      setCategories([]);
      setError(null);
      toast.success("Post created successfully!");
    } catch (error) {
      setError("Failed to create post");
      toast.error("Failed to create post");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (post: BlogPost) => {
    setEditingId(post._id);
    setEditTitle(post.title);
    setEditSlug(post.slug);
    setEditExcerpt(post.excerpt);
    setEditContent(post.content);
    setEditImageUrl(post.imageUrl || "");
    setEditSlugManuallyEdited(false);
    setEditCategories(post.categories || []);
  };

  const saveEdit = async (id: string) => {
    try {
      await updateBlogPost({
        _id: id as Id<"blogPosts">,
        title: editTitle,
        slug: editSlug,
        excerpt: editExcerpt,
        content: editContent,
        imageUrl: editImageUrl,
        categories: editCategories,
      });
      setEditingId(null);
      toast.success("Post updated successfully!");
    } catch (error) {
      toast.error("Failed to update post");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditSlug("");
    setEditExcerpt("");
    setEditContent("");
    setEditImageUrl("");
    setEditSlugManuallyEdited(false);
  };

  const confirmDelete = (id: string) => {
    if (
      typeof window !== "undefined" &&
      window.confirm("Are you sure you want to delete this post?")
    ) {
      deleteBlogPost({
        _id: id as Id<"blogPosts">,
      });
      toast.success("Post deleted successfully!");
    }
  };

  const slugify = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  type MarkdownShortcut = {
    label: React.ReactNode;
    title: string;
    md: string;
    wrap?: string;
    block?: boolean;
  };

  const markdownShortcuts = [
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
      const response = await fetch("/api/convert-markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to convert to markdown");
      }

      const data = await response.json();
      return data.markdown;
    } catch (error) {
      console.error("Error converting to markdown:", error);
      toast.error("Failed to convert to markdown");
      return text;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {adminError && (
        <div className="bg-red-100 text-red-700 p-4 rounded shadow max-w-xl mx-auto mt-10 text-center">
          <strong>Error:</strong> {adminError}
        </div>
      )}
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Overview Cards */}
            <DashboardOverview
              totalPosts={blogPosts?.length || 0}
              totalMessages={contactMessages?.length || 0}
            />

            {/* Make the grid a flex container for full height sidebar */}
            <div className="mt-8 flex flex-col md:flex-row gap-8 min-h-[60vh] md:min-h-[calc(100vh-16rem)]">
              {/* Sidebar */}
              <div className="md:w-1/4 w-full md:sticky md:top-16 md:self-start">
                <div className="h-full md:min-h-[calc(100vh-8rem)]">
                  <Sidebar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    collapsed={sidebarCollapsed}
                    setCollapsed={setSidebarCollapsed}
                  />
                </div>
              </div>

              {/* Main Content */}
              <div
                className={`transition-all duration-300 ${sidebarCollapsed ? "md:w-full" : "md:w-3/4"} w-full`}
              >
                {activeTab === "profiles" && <ProfileManagement />}
                {activeTab === "contact" && (
                  <ContactMessages messages={contactMessages || []} />
                )}
                {activeTab === "blog" && (
                  <BlogPosts
                    posts={blogPosts || []}
                    editingPost={editingId}
                    setEditingPost={(id) => {
                      const post = blogPosts?.find((p) => p._id === id);
                      if (post) startEdit(post);
                      else setEditingId(id);
                    }}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    editSlug={editSlug}
                    setEditSlug={setEditSlug}
                    editExcerpt={editExcerpt}
                    setEditExcerpt={setEditExcerpt}
                    editContent={editContent}
                    setEditContent={setEditContent}
                    editImageUrl={editImageUrl}
                    setEditImageUrl={setEditImageUrl}
                    editSlugManuallyEdited={editSlugManuallyEdited}
                    setEditSlugManuallyEdited={setEditSlugManuallyEdited}
                    editPexelsOpen={editPexelsOpen}
                    setEditPexelsOpen={setEditPexelsOpen}
                    markdownShortcuts={markdownShortcuts}
                    insertMarkdown={insertMarkdown}
                    editContentRef={editContentRef}
                    convertToMarkdownWithGemini={convertToMarkdownWithGemini}
                    slugify={slugify}
                    saveEdit={saveEdit}
                    cancelEdit={cancelEdit}
                    deletePost={confirmDelete}
                    editCategories={editCategories}
                    setEditCategories={setEditCategories}
                  />
                )}
                {activeTab === "create" && (
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
                  />
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Image Selection Modal */}
      <PexelsImageModal
        isOpen={pexelsOpen}
        onClose={() => setPexelsOpen(false)}
        onSelect={(url: string) => {
          setImageUrl(url);
          setPexelsOpen(false);
        }}
      />

      {/* Edit Image Selection Modal */}
      <PexelsImageModal
        isOpen={editPexelsOpen}
        onClose={() => setEditPexelsOpen(false)}
        onSelect={(url: string) => {
          setEditImageUrl(url);
          setEditPexelsOpen(false);
        }}
      />
    </div>
  );
}

export default function AdminPage() {
  return (
    <>
      <Head>
        <title>Admin Dashboard | Aroosi</title>
        <meta
          name="description"
          content="Admin dashboard for Aroosi, the UK's trusted Muslim matrimony platform."
        />
        <meta property="og:title" content="Admin Dashboard | Aroosi" />
        <meta
          property="og:description"
          content="Admin dashboard for Aroosi, the UK's trusted Muslim matrimony platform."
        />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:url" content="https://aroosi.co.uk/admin" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Admin Dashboard | Aroosi" />
        <meta
          name="twitter:description"
          content="Admin dashboard for Aroosi, the UK's trusted Muslim matrimony platform."
        />
        <meta name="twitter:image" content="/og-image.png" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <AdminPageInner />
      </QueryClientProvider>
    </>
  );
}
