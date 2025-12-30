import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/requireAuth";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

type ConvertMarkdownBody = {
  text?: string;
  prompt?: string;
};

function extractGeminiText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const candidates = (payload as any).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const parts = candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return null;
  const text = parts?.[0]?.text;
  return typeof text === "string" ? text : null;
}

export async function POST(req: NextRequest) {
  try {
    const { role } = await requireAuth(req);
    if ((role || "user") !== "admin") {
      return errorResponse("Admin privileges required", 403);
    }
  } catch {
    return errorResponse("Unauthorized", 401);
  }

  if (!GEMINI_API_KEY) {
    return errorResponse("Gemini API key is not configured on the server.", 500);
  }

  let body: ConvertMarkdownBody = {};
  try {
    body = (await req.json()) as ConvertMarkdownBody;
  } catch {
    return errorResponse("Invalid JSON in request body.", 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const extraPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!text) {
    return errorResponse("Please provide text to convert.", 400);
  }

  const prompt = [
    "You are a Markdown formatter.",
    "\nRules:",
    "- Convert the input into clean, readable GitHub-flavored Markdown.",
    "- Preserve ALL original meaning and details; do not summarize or invent.",
    "- Keep headings/lists/tables/code blocks when appropriate.",
    "- Return ONLY the markdown content, and nothing else.",
    extraPrompt ? `\nAdditional instructions:\n${extraPrompt}` : "",
    `\nInput:\n${text}`,
  ].join("\n");

  const geminiBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };

  let res: Response;
  try {
    res = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });
  } catch (err) {
    console.error("Error in convert-markdown route:", err);
    return errorResponse("Failed to connect to Gemini API.", 502);
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("Gemini API error (convert-markdown)", {
      status: res.status,
      statusText: res.statusText,
      errorData,
    });
    return errorResponse(`Gemini API error: ${res.status} ${res.statusText}`, res.status);
  }

  const payload = await res.json().catch(() => null);
  const markdown = extractGeminiText(payload);
  if (!markdown || !markdown.trim()) {
    return errorResponse("No markdown content received from Gemini", 502);
  }

  return successResponse({ markdown: markdown.trim() });
}
