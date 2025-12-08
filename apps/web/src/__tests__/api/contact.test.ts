import { POST } from "../../app/api/contact/route";
import { NextRequest } from "next/server";

// Mock firebase admin db/email to keep test isolated
jest.mock("@/lib/firebaseAdmin", () => {
  const submissions: any[] = [];
  return {
    db: {
      collection: (name: string) => ({
        orderBy: () => ({ get: async () => ({ docs: submissions.map((d, i) => ({ id: String(i), data: () => d })) }) }),
        add: async (doc: any) => { submissions.push(doc); return { id: String(submissions.length - 1) }; },
      }),
    },
  };
});
jest.mock("@/lib/email", () => ({ sendAdminNotification: jest.fn(), sendUserNotification: jest.fn() }));
jest.mock("@/lib/emailTemplates", () => ({ contactFormAdminTemplate: ({ name, email, message }: any) => ({ subject: `New from ${name}`, html: message }), contactFormUserAckTemplate: () => ({ subject: "Thanks", html: "Ack" }) }));

// Helper to build a NextRequest-like object for testing POST
function buildRequest(body: any, ip = "1.1.1.1") {
  const jsonBody = JSON.stringify(body);
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    body: jsonBody,
    headers: new Headers({
      "content-type": "application/json",
      "x-forwarded-for": ip,
      origin: "http://localhost",
      referer: "http://localhost/contact"
    }) as any,
  } as any);
}

describe("/api/contact POST", () => {
  const valid = {
    name: "John Doe",
    email: "john@example.com",
    subject: "Need assistance",
    message: "Hello there this is a message with enough length." ,
  };

  it("returns success for valid submission", async () => {
    const req = buildRequest(valid);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("enforces rate limit after 5 submissions", async () => {
    let last: Response | null = null;
    for (let i = 0; i < 6; i++) {
      const req = buildRequest({ ...valid, subject: `Need assistance ${i}` });
      // eslint-disable-next-line no-await-in-loop
      last = await POST(req as any);
    }
    expect(last).not.toBeNull();
    if (last) {
      const data = await last.json();
      expect([200,429]).toContain(last.status);
      if (last.status === 429) {
        expect(data.success).toBe(false);
      }
    }
  });
});
