import { NextRequest, NextResponse } from "next/server";
import { nowTimestamp } from "@/lib/utils/timestamp";


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
  GEMINI_API_KEY;

const ALLOWED_TOPICS = [
  "aroosi",
  "matrimony",
  "marriage",
  "profile",
  "interest",
  "message",
  "block",
  "blog",
  "search",
  "features",
  "site",
  "account",
  "privacy",
  "security",
  "uk",
  "user",
  "sign up",
  "sign in",
  "contact",
  "help",
  "support",
  "ai assistant",
  "chatbot",
  "dating",
  "relationship",
  "partner",
  "match",
  "compatibility",
  "preferences",
  "settings",
  "notifications",
  "profile picture",
  "verification",
  "premium",
  "subscription",
  "payment",
  "refund",
  "terms",
  "conditions",
  "guidelines",
  "community",
  "events",
  "success stories",
  "testimonials",
  "safety",
  "report",
  "block user",
  "delete account",
  "data privacy",
  "cookies",
  "accessibility",
  "mobile app",
  "desktop",
  "browser",
  "technical",
  "bug",
  "feedback",
  "suggestions",
  "improvements",
];

function isAllowedQuestion(text: string) {
  const lower = text.toLowerCase();
  return ALLOWED_TOPICS.some((topic) => lower.includes(topic));
}

async function saveChatbotMessage({
  email,
  role,
  text,
}: {
  email: string;
  role: "user" | "bot";
  text: string;
}) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/saveChatbotMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.INTERNAL_API_KEY
          ? { "x-internal-api-key": process.env.INTERNAL_API_KEY }
          : {}),
      },
      body: JSON.stringify({
        email,
        role,
        text,
        timestamp: nowTimestamp(),
      }),
    });
    if (!response.ok) {
      console.error("Failed to save chatbot message:", await response.text());
    }
  } catch (error) {
    console.error("Error saving chatbot message:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { reply: "Gemini API key is not configured on the server." },
        { status: 500 }
      );
    }
    const { messages, email } = await req.json();
    if (!Array.isArray(messages) || typeof email !== "string" || !email) {
      return NextResponse.json(
        { reply: "Please provide your email to use the chat assistant." },
        { status: 400 }
      );
    }
    // Save all user messages to Convex (no-op for now)
    for (const m of messages) {
      if (m.role === "user") {
        await saveChatbotMessage({ email, role: "user", text: m.text });
      }
    }
    // Only answer if the last user message is in allowed topics
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg || !isAllowedQuestion(lastUserMsg.text)) {
      const refusal =
        "Sorry, I can only answer questions about Aroosi, matrimony, and this site's features. Please ask something related.";
      await saveChatbotMessage({ email, role: "bot", text: refusal });
      return NextResponse.json({ reply: refusal });
    }
    // Add a system message for personality
    const systemMessage = {
      role: "user",
      parts: [
        {
          text: "You are Aroosi, a friendly and knowledgeable AI assistant for a UK-based matrimony site. You're warm, supportive, and inclusive, helping people from all backgrounds find meaningful connections. You provide clear, concise answers about the site's features, safety measures, and how to make the most of the platform. You're knowledgeable about modern dating practices, relationship building, and online safety. You maintain a professional yet approachable tone, always prioritizing user privacy and well-being. You can discuss topics like profile creation, matching, communication features, safety measures, and general relationship advice within the context of the platform.",
        },
      ],
    };
    // Convert messages to Gemini format
    const geminiMessages = [
      systemMessage,
      ...messages.map((m: { role: string; text: string }) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      })),
    ];
    const body = {
      contents: geminiMessages,
    };
    let res, data;
    try {
      res = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error("Error in gemini-chat route:", err);
      return NextResponse.json(
        {
          reply:
            "The Gemini API is currently unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }
    if (!res.ok) {
      let errorMsg = `Gemini API error: ${res.status} ${res.statusText}`;
      try {
        data = await res.json();
        if (data?.error?.message) errorMsg += ` - ${data.error.message}`;
      } catch {}
      return NextResponse.json({ reply: errorMsg }, { status: 503 });
    }
    data = await res.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't get a response.";
    await saveChatbotMessage({ email, role: "bot", text: reply });
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    console.error("Error in gemini-chat route:", err);
    return NextResponse.json(
      {
        reply: `Server error: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 }
    );
  }
}
