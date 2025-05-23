"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Input } from "@/components/ui/input";
import React from "react";

export default function BlogPage() {
  const posts = useQuery(api.contact.listBlogPosts, {});
  const [search, setSearch] = React.useState("");
  const filteredPosts = React.useMemo(() => {
    if (!posts) return [];
    if (!search.trim()) return posts;
    const s = search.toLowerCase();
    return posts.filter(
      (p: any) =>
        p.title.toLowerCase().includes(s) || p.excerpt.toLowerCase().includes(s)
    );
  }, [posts, search]);
  return (
    <>
      <section className="pt-24 sm:pt-28 md:pt-32 mb-12 text-center">
        <h1
          className="text-4xl sm:text-5xl font-serif font-bold text-pink-600 mb-4"
          style={{ fontFamily: "Lora, serif" }}
        >
          Matrimonial Blog
        </h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6">
          Advice, inspiration, and real stories for UK singles and families.
          Discover how to make the most of your Aroosi journey.
        </p>
        <div className="max-w-md mx-auto">
          <Input
            placeholder="Search blog posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border-pink-200 focus:border-pink-400 shadow-sm"
          />
        </div>
      </section>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts === undefined ? (
          <div className="col-span-full text-center text-gray-400 animate-pulse">
            Loading posts...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="col-span-full text-center text-gray-400">
            No blog posts found.
          </div>
        ) : (
          filteredPosts.map((post: any) => (
            <Card
              key={post._id}
              className="hover:shadow-xl transition-shadow border-0 bg-white/90 rounded-2xl overflow-hidden flex flex-col"
            >
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full h-40 object-cover"
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
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-block text-pink-600 hover:text-pink-700 font-semibold underline text-sm"
                >
                  Read more
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
