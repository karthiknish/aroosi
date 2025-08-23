import "server-only";
import { Resend } from "resend";
import { welcomeEmailHtml } from "@/emails/welcome";
import { resetPasswordEmailHtml } from "@/emails/resetPassword";
import { forgotPasswordEmailHtml } from "@/emails/forgotPassword";
import { verifyEmailHtml } from "@/emails/verifyEmail";

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

/**
 * Send a forgot password request email (same content as reset but with context).
 * If you prefer to use a different subject/body for the initial request, use this.
 */
export async function sendForgotPasswordEmail(
  email: string,
  resetUrl: string
): Promise<boolean> {
  try {
    const html = forgotPasswordEmailHtml(resetUrl);
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Password reset requested",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send forgot password email:", error);
    return false;
  }
}

export async function sendVerificationLinkEmail(
  email: string,
  name: string,
  verifyUrl: string
): Promise<boolean> {
  try {
    const html = verifyEmailHtml(name, verifyUrl);
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Verify your email address – Aroosi",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send verification link email:", error);
    return false;
  }
}


