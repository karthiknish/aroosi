import "server-only";
import { Resend } from "resend";
import { welcomeEmailHtml } from "@/emails/welcome";
import { resetPasswordEmailHtml } from "@/emails/resetPassword";
import { forgotPasswordEmailHtml } from "@/emails/forgotPassword";
import { verifyEmailHtml } from "@/emails/verifyEmail";
import { render as renderEmail } from "@react-email/render";
import { PasswordChangedEmail } from "@/emails/PasswordChangedEmail";
import { EmailChangedEmail } from "@/emails/EmailChangedEmail";
import { NewDeviceLoginEmail } from "@/emails/NewDeviceLoginEmail";
import { SubscriptionReceiptEmail } from "@/emails/SubscriptionReceiptEmail";

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

export async function sendPasswordChangedEmail(
  email: string,
  loginUrl: string
): Promise<boolean> {
  try {
    const html = await renderEmail(
      <PasswordChangedEmail loginUrl={loginUrl} />
    );
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Your password was changed",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send password changed email:", error);
    return false;
  }
}

export async function sendEmailChangedEmail(
  email: string,
  params: { oldEmail: string; newEmail: string; manageUrl: string }
): Promise<boolean> {
  try {
    const html = await renderEmail(<EmailChangedEmail {...params} />);
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Your email was changed",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email changed email:", error);
    return false;
  }
}

export async function sendNewDeviceLoginEmail(
  email: string,
  params: { device: string; location?: string; time: string; manageUrl: string }
): Promise<boolean> {
  try {
    const html = await renderEmail(<NewDeviceLoginEmail {...params} />);
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "New login to your account",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send new device login email:", error);
    return false;
  }
}

export async function sendSubscriptionReceiptEmail(
  email: string,
  params: {
    plan: string;
    amount: string;
    currency: string;
    periodStart: string;
    periodEnd: string;
    invoiceUrl?: string;
  }
): Promise<boolean> {
  try {
    const html = await renderEmail(<SubscriptionReceiptEmail {...params} />);
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Your subscription receipt",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send subscription receipt email:", error);
    return false;
  }
}


