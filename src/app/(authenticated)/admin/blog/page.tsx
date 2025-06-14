"use client";
import { useRouter } from "next/navigation";
import { fetchAdminBlogPosts, deleteBlogPost } from "@/lib/blogUtil";
import type { BlogPost } from "@/types/blog";
import { useAuthContext } from "@/components/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminBlogPage() {
  const { token, isAdmin, isLoaded } = useAuthContext();
  const router = useRouter();

  // Use react-query to fetch blogs
  const {
    data: blogs = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<BlogPost[]>({
    queryKey: ["adminBlogs", token],
    queryFn: () => (token ? fetchAdminBlogPosts({ token }) : []),
    enabled: isLoaded && isAdmin && !!token,
  });

  // Redirect to blog edit page
  const handleEditClick = (blog: BlogPost) => {
    router.push(`/admin/blog/edit?slug=${blog.slug}`);
  };

  const handleDelete = async (id: string) => {
    if (typeof deleteBlogPost === "function" && typeof token === "string") {
      await deleteBlogPost(token, id);
      refetch();
    } else {
      console.error(
        "deleteBlog is not a function in blogUtil or token is missing"
      );
    }
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
    <div className="max-w-5xl my-8 mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-pink-700">
        Admin Blog Management
      </h1>
      <Button asChild className="mb-8 px-6 py-2 font-semibold shadow">
        <Link href="/admin/blog/create">+ Create Blog</Link>
      </Button>
      {blogs.length === 0 ? (
        <EmptyState message="No blog posts found." className="py-16" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs
            .filter((blog) => typeof blog._id === "string")
            .map((blog) => (
              <Card
                key={blog._id}
                className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow"
              >
                {blog.imageUrl && (
                  <img
                    src={blog.imageUrl}
                    alt={blog.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-pink-800 line-clamp-2">
                    {blog.title}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {blog.categories?.map((cat) => (
                      <Badge
                        key={cat}
                        variant="secondary"
                        className="text-pink-700 bg-pink-100"
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-gray-700 mb-4 line-clamp-3">
                    {blog.excerpt}
                  </p>
                </CardContent>
                <CardFooter className="mt-auto flex gap-2">
                  <Button
                    onClick={() => handleEditClick(blog)}
                    className="px-4 py-1 font-semibold bg-pink-500 text-white hover:bg-pink-600"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(blog._id!)}
                    variant="secondary"
                    className="px-4 py-1 text-pink-700 font-semibold"
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
