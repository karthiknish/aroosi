import "server-only";
import { Resend } from "resend";
import { welcomeEmailHtml } from "@/emails/welcome";
import { resetPasswordEmailHtml } from "@/emails/resetPassword";

const resend = new Resend(process.env.RESEND_API_KEY);

// OTP emails removed

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<boolean> {
  try {
    const html = welcomeEmailHtml(name);
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Welcome to Aroosi",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
}

/**
 * Send a password reset link email pointing users to the reset page.
 */
export async function sendResetLinkEmail(
  email: string,
  resetUrl: string
): Promise<boolean> {
  try {
    const html = resetPasswordEmailHtml(resetUrl);
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Reset your Aroosi password",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send reset link email:", error);
    return false;
  }
}


