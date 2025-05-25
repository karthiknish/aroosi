import { NextRequest } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

function errorResponse(message: string, status: number = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function successResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  try {
    if (req.method !== "POST") {
      return errorResponse("Method Not Allowed", 405);
    }

    if (!GEMINI_API_KEY) {
      return errorResponse(
        "Gemini API key is not configured on the server.",
        500
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON in request body.", 400);
    }

    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const type = typeof body?.type === "string" ? body.type : "html";
    if (!text) {
      return errorResponse("Please provide text to convert.", 400);
    }

    let prompt = "";
    if (type === "blog") {
      console.log("Converting to blog");
      prompt = `You are an HTML formatter for blog posts.\n\n- Your ONLY job is to convert the input text into clean, semantic HTML, preserving ALL original content, structure, and formatting.\n- Do NOT summarize, extract, paraphrase, or generate a title, excerpt, or categories.\n- Do NOT add, remove, or change any content, headings, or sections.\n- If the input is already valid HTML, return it unchanged (except for fixing minor HTML errors if present).\n- Use appropriate tags (<h1> to <h6>, <p>, <ul>, <ol>, <li>, <blockquote>, <code>, <pre>, <a>, <table>, etc.) based on the structure and intent of the content.\n- Preserve all formatting such as bold, italics, blockquotes, inline code, tables, lists, and links.\n- Do NOT include <html>, <head>, or <body> tags.\n- Return ONLY the HTML content, and nothing else.\n- Do NOT output any summary, title, excerpt, or categories.\n\nInput:\n${text}`;
    } else if (type === "excerpt") {
      console.log("Converting to excerpt");
      prompt = `Write a concise, engaging excerpt for this blog post (1-2 sentences, plain text only, no HTML):\n${text}`;
    } else if (type === "category") {
      console.log("Converting to category");
      prompt = `Suggest 1-3 relevant blog categories for this post, comma separated (plain text, no HTML):\n${text}`;
    } else {
      prompt = text;
    }

    const geminiBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    };

    let res: Response;
    try {
      res = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });
    } catch (err) {
      return errorResponse("Failed to connect to Gemini API.", 502);
    }

    if (!res.ok) {
      let errorMsg = `Gemini API error: ${res.status} ${res.statusText}`;
      let errorDetails = "";
      try {
        const errJson = await res.json();
        errorDetails = errJson?.error?.message || "";
      } catch {}
      if (errorDetails) errorMsg += ` - ${errorDetails}`;
      return errorResponse(errorMsg, res.status);
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      return errorResponse("Invalid response from Gemini API.", 502);
    }

    const html = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!html || typeof html !== "string" || !html.trim()) {
      return errorResponse("No HTML content received from Gemini", 502);
    }

    return successResponse({ html });
  } catch (error: any) {
    console.error("Error converting to HTML:", error);
    return errorResponse(error?.message || "Failed to convert to HTML", 500);
  }
}
