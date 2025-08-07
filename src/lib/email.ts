import { Resend } from "resend";

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
}

export const sendEmail = async (options: SendEmailOptions) => {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: options.from || "Aroosi <noreply@aroosi.app>",
      to: options.to,
      subject: options.subject,
      html: options.html,
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

  return sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `[Admin Notification] ${subject}`,
    html,
  });
};

export const sendUserNotification = async (
  email: string,
  subject: string,
  html: string
) => {
  return sendEmail({
    to: email,
    subject,
    html,
  });
};
