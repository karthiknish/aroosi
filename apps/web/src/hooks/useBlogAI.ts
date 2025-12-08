import { useState, useCallback } from "react";
import { convertAiTextToHtml } from "@/lib/blogUtil";
import { showErrorToast } from "@/lib/ui/toast";

export type AiField = "excerpt" | "category" | "title" | "content";

export interface UseBlogAIProps {
  title: string;
  slug: string;
  excerpt: string;
  categories: string[];
  content: string;
}

export function useBlogAI({
  title,
  slug,
  excerpt,
  categories,
  content,
}: UseBlogAIProps) {
  const [aiLoading, setAiLoading] = useState<{
    excerpt?: boolean;
    category?: boolean;
    title?: boolean;
    content?: boolean;
  }>({});

  const aiText = useCallback(
    async (text: string, field: AiField) => {
      setAiLoading((prev) => ({ ...prev, [field]: true }));
      try {
        const stripTags = (s: string) =>
          s
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const cleanGeneratedHtml = (html: string): string => {
          if (!html) return html;
          // Remove fenced code blocks markers e.g., ```html ... ```
          let out = html.replace(/```[a-zA-Z]*\s*\n?/g, "").replace(/```/g, "");
          // Remove leading prompt echo lines (Title:/Excerpt:/Categories:) if present as plain text
          out = out.replace(
            /^(\s*(Title|Excerpt|Categories)\s*:[^\n]*\n)+/i,
            ""
          );
          // Remove up to three leading <p> that echo prompt
          for (let i = 0; i < 3; i++) {
            const before = out;
            out = out.replace(
              /^\s*<p>\s*(Title|Excerpt|Categories)\s*:[\s\S]*?<\/p>\s*/i,
              ""
            );
            if (out === before) break;
          }
          return out.trim();
        };

        if (field === "content") {
          // Build an instruction prompt to generate a full article
          const instructions = `Write a complete blog article in clean semantic HTML based on the details below.
Requirements:
- Use the Title exactly once as the <h1> at the top.
- Use British English spelling and punctuation throughout (e.g., colour, organise, programme).
- Do NOT include any lines like "Title:", "Excerpt:", or "Categories:" in the output, and do NOT wrap anything in code fences.
- Include: an engaging introduction paragraph, 4–6 concise sections with <h2> headings, at least one <ul> list, and a short conclusion with a call to action.
- Length target: 800–1200 words. Tone: warm, helpful, and authoritative.
- Allowed tags only: <h1>, <h2>, <p>, <ul>, <ol>, <li>, <blockquote>, <strong>, <em>, <a>. No inline styles, no scripts.`;
          const contextLines: string[] = [];
          if (title) contextLines.push(`Title: ${title}`);
          if (excerpt) contextLines.push(`Excerpt: ${excerpt}`);
          if (categories && categories.length)
            contextLines.push(`Categories: ${categories.join(", ")}`);
          const prompt = `${instructions}\n\n${contextLines.join("\n")}`;
          const res = await convertAiTextToHtml({
            text: prompt,
            type: "blog",
          } as any);
          const raw = typeof res === "string" ? res : (res as any)?.html || "";
          return cleanGeneratedHtml(raw);
        }

        // For title/excerpt/category, build a clean context and ensure plain text
        let context = text;
        if (field === "title" || field === "excerpt" || field === "category") {
          const base = stripTags(content || "");
          const ctxLines: string[] = [];
          if (base) ctxLines.push(base);
          if (title) ctxLines.push(`Current title: ${stripTags(title)}`);
          if (slug) ctxLines.push(`Slug: ${slug}`);
          if (categories && categories.length)
            ctxLines.push(`Categories: ${categories.join(", ")}`);
          context = ctxLines.join("\n\n");
        }

        const res = await convertAiTextToHtml({
          text: context,
          type: field,
        } as any);
        // title/excerpt/category return plain text via html field
        if (typeof res === "string") return res;
        return (res as any)?.html || "";
      } catch (error) {
        console.error(`Error in AI ${field} generation:`, error);
        const message =
          error instanceof Error ? error.message : "AI processing failed";
        showErrorToast(null, message);
        return "";
      } finally {
        setAiLoading((prev) => ({ ...prev, [field]: false }));
      }
    },
    [content, title, slug, categories]
  );

  return { aiLoading, aiText };
}
