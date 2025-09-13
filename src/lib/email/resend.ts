import { Resend } from "resend";

export type Attachment = {
  filename: string;
  content?: string | Buffer;
  path?: string; // not used by Resend directly; caller can load content
  contentType?: string;
};

export type SendEmailInput = {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  headers?: Record<string, string>;
  attachments?: Attachment[];
};

let client: Resend | null = null;
function getClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
    client = new Resend(apiKey);
  }
  return client;
}

export async function sendEmail(input: SendEmailInput) {
  const resend = getClient();
  const payload: any = {
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    cc: input.cc && input.cc.length ? input.cc : undefined,
    bcc: input.bcc && input.bcc.length ? input.bcc : undefined,
    headers: input.headers,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content as any,
    })),
  };
  const res = await resend.emails.send(payload);
  return res;
}
