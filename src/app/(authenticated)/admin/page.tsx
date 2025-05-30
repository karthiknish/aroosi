"use client";

import { useState, useRef, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { PexelsImageModal } from "@/components/PexelsImageModal";
import { toast } from "sonner";
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import { ContactMessages } from "@/components/admin/ContactMessages";
import type { ContactMessage } from "@/components/admin/ContactMessages";
import { BlogPosts } from "@/components/admin/BlogPosts";
import { CreatePost } from "@/components/admin/CreatePost";
import ProfileManagement from "@/components/admin/ProfileManagement";
import Head from "next/head";
import { Id } from "@convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import type { Profile } from "@/types/profile";
import { BlogPostFields } from "@/components/admin/BlogPostFields";
import BlogEditor from "@/components/admin/BlogEditor";
import { useToken } from "@/components/TokenProvider";

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

type Interest = {
  fromUserId: Id<"users">;
  toUserId: Id<"users">;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
};

function AdminPageInner() {
  // All hooks at the top
  // Tab order: contact first
  const TABS = [
    { key: "contact", label: "Contact" },
    { key: "blog", label: "Blog" },
    { key: "profiles", label: "Profiles" },
    { key: "matches", label: "Matches" },
  ];
  // Read initial tab from localStorage if available
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("adminActiveTab") || "contact";
    }
    return "contact";
  });
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
  const [editCategories, setEditCategories] = useState<string[]>([]);

  const { user, isLoaded, isSignedIn } = useUser();
  const token = useToken();

  // Replace Convex queries with API fetches
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);

  const [previewHtml, setPreviewHtml] = useState<string>("");
  const editorResetKey = 0;
  // Blog posts
  useEffect(() => {
    if (activeTab !== "blog") return;
    let ignore = false;
    async function fetchBlogPosts() {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const blogRes = await fetch("/api/blog", { headers });
      if (!ignore) {
        if (blogRes.ok) {
          const data = await blogRes.json();
          setBlogPosts(Array.isArray(data) ? data : data.posts || []);
        } else {
          setBlogPosts([]);
        }
        setLoading(false);
      }
    }
    fetchBlogPosts();
    return () => {
      ignore = true;
    };
  }, [activeTab, token]);

  // Contact messages
  useEffect(() => {
    if (activeTab !== "contact") return;
    let ignore = false;
    async function fetchContactMessages() {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const contactRes = await fetch("/api/contact", { headers });
      if (!ignore) {
        setContactMessages(contactRes.ok ? await contactRes.json() : []);
        setLoading(false);
      }
    }
    fetchContactMessages();
    return () => {
      ignore = true;
    };
  }, [activeTab, token]);

  // Interests
  useEffect(() => {
    if (activeTab !== "matches") return;
    let ignore = false;
    async function fetchInterests() {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const interestsRes = await fetch("/api/admin/interests", { headers });
      if (!ignore) {
        setInterests(interestsRes.ok ? await interestsRes.json() : []);
        setLoading(false);
      }
    }
    fetchInterests();
    return () => {
      ignore = true;
    };
  }, [activeTab, token]);

  // Live preview effect for create post (must be before any early returns)
  useEffect(() => {
    setPreviewHtml(content);
  }, [content]);

  // Save tab to localStorage on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("adminActiveTab", activeTab);
    }
  }, [activeTab]);

  // Only after all hooks:
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
  const isAdmin = user?.publicMetadata?.role === "admin";
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 text-red-700 p-4 rounded shadow max-w-xl mx-auto text-center">
          <strong>Error:</strong> You must be an admin to view this page.
        </div>
      </div>
    );
  }

  // Map Convex data to expected types
  const mutualMatches = interests
    .filter((i) => i.status === "accepted")
    .map((i) => ({
      profileA: null,
      profileB: null,
    }))
    .filter((m) => m.profileA && m.profileB);

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/blog", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          content,
          imageUrl,
          categories: [],
        }),
      });
      if (!res.ok) throw new Error("Failed to create post");
      const post = await res.json();
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt);
      setContent(post.content);
      setImageUrl(post.imageUrl || "");
      setError(null);
      toast.success("Post created successfully!");
    } catch {
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
    setEditCategories(post.categories || []);
    setEditSlugManuallyEdited(false);
  };

  const saveEdit = async (id: string) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/blog/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          _id: id,
          title: editTitle,
          slug: editSlug,
          excerpt: editExcerpt,
          content: editContent,
          imageUrl: editImageUrl,
          categories: editCategories,
        }),
      });
      if (!res.ok) throw new Error("Failed to update post");
      setEditingId(null);
      toast.success("Post updated successfully!");
    } catch {
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
    if (window.confirm("Are you sure you want to delete this post?")) {
      (async () => {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        fetch(`/api/blog/${id}`, {
          method: "DELETE",
          headers,
        }).then((res) => {
          if (res.ok) {
            toast.success("Post deleted successfully!");
            setBlogPosts((prev) => prev.filter((p) => p._id !== id));
          } else {
            toast.error("Failed to delete post");
          }
        });
      })();
    }
  };

  const slugify = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

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

  // Utility for AI excerpt/category (plain text)
  async function aiText(text: string, field: "excerpt" | "category") {
    try {
      const res = await fetch("/api/convert-ai-text-to-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, type: field }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI error");
      // Extract plain text from HTML
      const temp = document.createElement("div");
      temp.innerHTML = data.html;
      const plain = temp.textContent || temp.innerText || "";
      return plain.trim();
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: unknown }).message)
          : "AI error";
      toast.error(message);
      return "";
    }
  }

  // Markdown shortcuts
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}

      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Overview Cards */}
        <DashboardOverview
          totalPosts={blogPosts.length}
          totalMessages={contactMessages.length}
        />

        <div className="mt-8 flex flex-col md:flex-row gap-8 min-h-[60vh]">
          {/* Sidebar */}
          <aside className="md:w-1/4 w-full md:sticky md:top-24">
            <nav className="bg-pink-50 border border-pink-100 rounded-lg shadow p-4 flex md:flex-col gap-2 mb-4 md:mb-0">
              {TABS.map((tab) => (
                <Button
                  key={tab.key}
                  variant={activeTab === tab.key ? "default" : "ghost"}
                  className={`w-full justify-start rounded font-semibold transition-colors ${activeTab === tab.key ? "bg-pink-600 text-white hover:bg-pink-700" : "text-pink-700 hover:bg-pink-100"}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </Button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {activeTab === "profiles" && <ProfileManagement />}
            {activeTab === "matches" && (
              <AdminMatches mutualMatches={mutualMatches} />
            )}
            {activeTab === "contact" && (
              <ContactMessages messages={contactMessages} loading={loading} />
            )}
            {activeTab === "blog" && (
              <>
                {/* Search/Filter Bar */}
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Search posts..."
                    className="w-full md:w-1/3 px-3 py-2 border rounded focus:ring-2 focus:ring-pink-200 bg-white"
                    // Add search logic if desired
                  />
                  {/* <Button variant="outline">Filter</Button> */}
                </div>
                {/* Edit Blog Form (separate from list) */}
                {editingId && (
                  <div className="mb-8">
                    <div className="max-w-2xl mx-auto">
                      <div className="bg-white rounded-lg shadow-lg p-6 border border-pink-200">
                        <h2 className="text-xl font-bold mb-4 text-pink-700">
                          Edit Blog Post
                        </h2>
                        <BlogPostFields
                          title={editTitle}
                          setTitle={setEditTitle}
                          slug={editSlug}
                          setSlug={setEditSlug}
                          slugManuallyEdited={editSlugManuallyEdited}
                          setSlugManuallyEdited={setEditSlugManuallyEdited}
                          slugify={slugify}
                          excerpt={editExcerpt}
                          setExcerpt={setEditExcerpt}
                          categories={editCategories}
                          setCategories={setEditCategories}
                          imageUrl={editImageUrl}
                          setImageUrl={setEditImageUrl}
                          pexelsOpen={editPexelsOpen}
                          setPexelsOpen={setEditPexelsOpen}
                          aiLoading={{}}
                          aiText={aiText}
                          content={editContent}
                          disabled={false}
                        />
                        <div className="md:flex gap-6 mt-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">Content</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-pink-600 border-pink-300"
                                onClick={async () => {
                                  const ai = await (async () => {
                                    const res = await fetch(
                                      "/api/convert-ai-text-to-html",
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          text: `${editTitle}\n${editExcerpt}`,
                                          type: "blog",
                                        }),
                                      }
                                    );
                                    const data = await res.json();
                                    if (!res.ok)
                                      throw new Error(data.error || "AI error");
                                    return data.html;
                                  })();
                                  if (ai) setEditContent(ai);
                                }}
                              >
                                AI
                              </Button>
                            </div>
                            <BlogEditor
                              key={editingId}
                              value={editContent}
                              onChange={setEditContent}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            className="bg-pink-600 hover:bg-pink-700"
                            onClick={() => saveEdit(editingId)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <BlogPosts
                  posts={blogPosts}
                  setEditingPost={(id) => {
                    const post = blogPosts.find((p) => p._id === id);
                    if (post) startEdit(post);
                    else setEditingId(id);
                  }}
                  deletePost={confirmDelete}
                  loading={loading}
                />
              </>
            )}
            {activeTab === "create-post" && (
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
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      <PexelsImageModal
        isOpen={pexelsOpen}
        onClose={() => setPexelsOpen(false)}
        onSelect={(url: string) => {
          setImageUrl(url);
          setPexelsOpen(false);
        }}
      />
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

function AdminMatches({
  mutualMatches,
}: {
  mutualMatches: { profileA: Profile; profileB: Profile }[];
}) {
  return (
    <div className="p-6 bg-white rounded-lg shadow text-center">
      <h2 className="text-2xl font-bold mb-4">Mutual Matches</h2>
      {mutualMatches.length === 0 ? (
        <p className="text-gray-600">No mutual matches found.</p>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr className="bg-pink-50">
              <th className="py-2 px-4 border">User A</th>
              <th className="py-2 px-4 border">User B</th>
            </tr>
          </thead>
          <tbody>
            {mutualMatches.map((m, idx) => (
              <tr key={idx} className="border-t">
                <td className="py-2 px-4 border">
                  <Link
                    href={`/admin/profile/${m.profileA._id}`}
                    className="text-pink-600 hover:underline"
                  >
                    {m.profileA.fullName || m.profileA._id}
                  </Link>
                </td>
                <td className="py-2 px-4 border">
                  <Link
                    href={`/admin/profile/${m.profileB._id}`}
                    className="text-pink-600 hover:underline"
                  >
                    {m.profileB.fullName || m.profileB._id}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
      <QueryClientProvider client={new QueryClient()}>
        <AdminPageInner />
      </QueryClientProvider>
    </>
  );
}
