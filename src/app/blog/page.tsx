"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

import React from "react";

import { Button } from "@/components/ui/button";

export default function BlogPage() {
  const [page, setPage] = React.useState(0);
  const pageSize = 6;
  const [category, setCategory] = React.useState("all");
  // Example categories, ideally fetch from API or config
  const categories = ["all", "Advice", "Stories", "Inspiration", "Tips"];
  const { posts = [], total = 0 } =
    useQuery(api.blog.listBlogPostsPaginated, {
      page,
      pageSize,
      category: category === "all" ? undefined : category,
    }) || {};
  return (
    <>
      <section className="pt-24 sm:pt-28 md:pt-32 mb-12 text-center bg-gradient-to-b from-pink-50 via-white to-white">
        <h1
          className="text-4xl sm:text-5xl font-serif font-bold text-pink-600 mb-4 drop-shadow"
          style={{ fontFamily: "Lora, serif" }}
        >
          Matrimonial Blog
        </h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6">
          Advice, inspiration, and real stories for UK singles and families.
          Discover how to make the most of your Aroosi journey.
        </p>
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto py-2 mb-8 justify-center scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-1 rounded-full border transition text-sm whitespace-nowrap font-medium ${category === cat ? "bg-pink-600 text-white border-pink-600 shadow" : "bg-white text-pink-700 border-pink-200 hover:bg-pink-50"}`}
              onClick={() => setCategory(cat)}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-500 mb-2">
          Showing {posts.length} of {total} posts
        </div>
      </section>
      <div className="px-2 sm:px-6 md:px-10 max-w-7xl mx-auto">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts === undefined ? (
            <div className="col-span-full text-center text-gray-400 animate-pulse">
              Loading posts...
            </div>
          ) : posts.length === 0 ? (
            <div className="col-span-full text-center text-gray-400">
              No blog posts found.
            </div>
          ) : (
            posts.map(
              (post: {
                _id: string;
                slug: string;
                title: string;
                createdAt: number;
                excerpt: string;
                imageUrl?: string;
                categories?: string[];
              }) => (
                <Link
                  key={post._id}
                  href={`/blog/${post.slug}`}
                  className="group block focus:outline-none focus:ring-2 focus:ring-pink-400 rounded-2xl"
                  tabIndex={0}
                >
                  <Card className="hover:shadow-2xl hover:-translate-y-1 transition-all border-0 bg-white/90 rounded-2xl overflow-hidden flex flex-col group cursor-pointer">
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <CardHeader className="flex-1">
                      <CardTitle
                        className="text-xl font-serif text-gray-900 mb-1"
                        style={{ fontFamily: "Lora, serif" }}
                      >
                        {post.title}
                      </CardTitle>
                      <div className="text-xs text-gray-500 mb-2">
                        {new Date(post.createdAt).toLocaleDateString("en-GB", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      <p className="text-gray-700 text-sm line-clamp-3 mb-2">
                        {post.excerpt}
                      </p>
                      {post.categories && post.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {post.categories.map((cat: string) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs font-medium"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              )
            )
          )}
        </div>
        {/* Pagination below posts */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 max-w-md mx-auto justify-center mt-12 mb-16">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <div className="text-sm text-gray-600">
            Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage((p) => (p + 1 < Math.ceil(total / pageSize) ? p + 1 : p))
            }
            disabled={page + 1 >= Math.ceil(total / pageSize)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
