import { Resend } from "resend";

let resend: Resend | null = null;

const getResendClient = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export const sendEmail = async (options: SendEmailOptions) => {
  try {
    const resendClient = getResendClient();
    if (!resendClient) {
      console.error("Resend API key not configured");
      return { error: "Email service not configured" };
    }
    
    const { data, error } = await resendClient.emails.send({
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
