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
    if (!text) {
      return errorResponse("Please provide text to convert.", 400);
    }

    const prompt = `You are a markdown formatting expert. Convert the following text into well-formatted markdown. Follow these rules:
1. Use appropriate headers (h1, h2, h3) for main topics and subtopics
2. Convert lists into proper markdown lists (both ordered and unordered)
3. Add emphasis (bold, italic) to important terms and phrases
4. Format code snippets with \`\`\` blocks
5. Convert URLs into proper markdown links
6. Use blockquotes for important quotes or highlights
7. Add horizontal rules to separate major sections
8. Keep the original meaning and structure
9. Make the content more readable and organized
10. Use tables where appropriate

Here's the text to convert:

${text}`;

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

    const markdown = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!markdown || typeof markdown !== "string" || !markdown.trim()) {
      return errorResponse("No markdown content received from Gemini", 502);
    }

    return successResponse({ markdown });
  } catch (error: any) {
    console.error("Error converting to markdown:", error);
    return errorResponse(
      error?.message || "Failed to convert to markdown",
      500
    );
  }
}
