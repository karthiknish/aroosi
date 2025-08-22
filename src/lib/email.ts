import { Resend } from "resend";
import { enqueueEmail } from "@/lib/emailQueue";

// Lazy-initialize Resend to avoid requiring API key in test environment
let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY || "test_key";
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  preheader?: string;
}

export const sendEmail = async (options: SendEmailOptions) => {
  try {
    const resend = getResend();
    // Inject preheader for better inbox preview
    const preheaderHtml = options.preheader
      ? `<div style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${options.preheader}</div>`
      : "";
    const htmlWithPreheader = `${preheaderHtml}${options.html}`;
    const { data, error } = await resend.emails.send({
      from: options.from || "Aroosi <noreply@aroosi.app>",
      to: options.to,
      subject: options.subject,
      html: htmlWithPreheader,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { error };
    }

    return { data };
  } catch (error) {
    console.error("Error sending email:", error);
    return { error };
  }
};

export const sendAdminNotification = async (subject: string, html: string) => {
  if (!process.env.ADMIN_EMAIL) {
    console.error("ADMIN_EMAIL environment variable not set");
    return { error: "Admin email not configured" };
  }
  // Enqueue instead of direct send
  await enqueueEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `[Admin Notification] ${subject}`,
    html,
    metadata: { type: "admin_notification" },
  });
  return { queued: true };
};

export const sendUserNotification = async (
  email: string,
  subject: string,
  html: string
) => {
  await enqueueEmail({
    to: email,
    subject,
    html,
    metadata: { type: "user_notification" },
  });
  return { queued: true };
};

// Categorized variant to enable downstream filtering/opt-outs per category
export const sendCategorizedUserEmail = async (
  email: string,
  subject: string,
  html: string,
  category?: string,
  preheader?: string
) => {
  await enqueueEmail({
    to: email,
    subject,
    html,
    preheader,
    metadata: { type: "user_notification", category },
  });
  return { queued: true };
};
