"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAdminBlogPosts, deleteBlogPost } from "@/lib/blogUtil";
import type { BlogPost } from "@/types/blog";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Eye, Grid, List } from "lucide-react";

export default function AdminBlogPage() {
  // Cookie-auth only; remove token from context
  const { isAdmin, isLoaded } = useAuthContext();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  // Use react-query to fetch blogs
  const {
    data: blogs = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<BlogPost[]>({
    // query is keyed without token now
    queryKey: ["adminBlogs"],
    // Server will read HttpOnly cookies and authorize
    queryFn: () => fetchAdminBlogPosts({ token: "" }),
    enabled: isLoaded && isAdmin,
  });

  // Filter blogs based on search term
  const filteredBlogs = blogs.filter(
    (blog) =>
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.categories?.some((cat) =>
        cat.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectedPosts.length === filteredBlogs.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredBlogs.map((blog) => blog._id!));
    }
  };

  const handleSelectPost = (id: string) => {
    setSelectedPosts((prev) =>
      prev.includes(id)
        ? prev.filter((postId) => postId !== id)
        : [...prev, id],
    );
  };

  // Actions
  const handleEditClick = (blog: BlogPost) => {
    router.push(`/admin/blog/edit?slug=${blog.slug}`);
  };

  const handleDelete = async (id: string) => {
    // Cookie-auth: server reads HttpOnly cookies; token no longer required
    if (typeof deleteBlogPost === "function") {
      await deleteBlogPost("", id);
      void refetch();
      setSelectedPosts((prev) => prev.filter((postId) => postId !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPosts.length === 0) return;
 
    for (const id of selectedPosts) {
      await deleteBlogPost("", id);
    }
    void refetch();
    setSelectedPosts([]);
  };
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading || !isLoaded) {
    return <Skeleton className="w-full h-full" />;
  }

  if (!isAdmin) {
    return (
      <ErrorState
        message="You must be an admin to view this page."
        className="min-h-[60vh]"
      />
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? "Failed to load blog posts."}
        onRetry={() => refetch()}
        className="min-h-[60vh]"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Blog Management
          </h1>
          <p className="text-gray-600">Manage your blog posts and content</p>
        </div>
        <Button asChild>
          <Link href="/admin/blog/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Link>
        </Button>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between space-y-2">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>

              {/* Bulk Actions */}
              {selectedPosts.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {selectedPosts.length} selected
                  </Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredBlogs.length === 0 ? (
        <EmptyState
          message={
            searchTerm ? "No posts match your search." : "No blog posts found."
          }
          className="py-16"
        />
      ) : viewMode === "table" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedPosts.length === filteredBlogs.length}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBlogs.map((blog) => (
                <TableRow key={blog._id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedPosts.includes(blog._id!)}
                      onChange={() => handleSelectPost(blog._id!)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {blog.imageUrl && (
                        <Image
                          src={blog.imageUrl}
                          alt={blog.title}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {blog.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {blog.excerpt}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {blog.categories?.slice(0, 2).map((cat) => (
                        <Badge
                          key={cat}
                          variant="secondary"
                          className="text-xs"
                        >
                          {cat}
                        </Badge>
                      ))}
                      {blog.categories && blog.categories.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{blog.categories.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-700">
                      Published
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {blog.createdAt && formatDate(blog.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/blog/${blog.slug}`)}
                        title="View post"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(blog)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(blog._id!)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.map((blog) => (
            <Card
              key={blog._id}
              className="group hover:shadow-lg transition-shadow"
            >
              {blog.imageUrl && (
                <div className="relative">
                  <Image
                    src={blog.imageUrl}
                    alt={blog.title}
                    width={400}
                    height={192}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={selectedPosts.includes(blog._id!)}
                      onChange={() => handleSelectPost(blog._id!)}
                      className="rounded"
                    />
                  </div>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold line-clamp-2">
                  {blog.title}
                </CardTitle>
                <div className="flex flex-wrap gap-1 mt-2">
                  {blog.categories?.slice(0, 3).map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm line-clamp-3">
                  {blog.excerpt}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-gray-500">
                    {blog.createdAt && formatDate(blog.createdAt)}
                  </span>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/blog/${blog.slug}`)}
                      title="View post"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(blog)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(blog._id!)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
