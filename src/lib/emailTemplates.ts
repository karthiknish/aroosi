/*
Email template helpers for major Aroosi site events.
Each helper returns an object with `subject` and `html` keys that can be passed directly to
`sendUserNotification` / `sendAdminNotification` utilities defined in email.ts.
All emails use <contact@aroosi.app> as the "from" address via the default in sendEmail().
*/

import { Profile } from "@/types/profile";

type EmailPayload = {
  subject: string;
  html: string;
};

// Shared wrapper that adds branded header / footer & inline styling for better compatibility
function wrapEmailContent(title: string, body: string): string {
  const brandGold = "#BFA67A";
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <style>
        /* Ensure full-width on mobile */
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; }
        }
        a.btn:hover { opacity: .9; }
      </style>
    </head>
    <body style="margin:0; padding:0; background:#faf7f2; font-family:'Nunito Sans',Helvetica,Arial,sans-serif; color:#222;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf7f2; padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" class="container" cellspacing="0" cellpadding="0" style="width:600px; max-width:600px; background:#ffffff; border:1px solid ${brandGold}; border-radius:8px; overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:${brandGold}; padding:24px; text-align:center;">
                  <img src="https://aroosi.app/logo.png" alt="Aroosi" width="120" style="display:block; margin:0 auto;" />
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding:32px 24px;">
                  ${body}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f5f5f5; padding:20px; text-align:center; font-size:12px; color:#666;">
                  You're receiving this email because you have an account on <strong>Aroosi</strong>.<br />
                  If you didn't expect this, please ignore it.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

// 1. Profile created (user)
export function profileCreatedTemplate(profile: Profile): EmailPayload {
  const fullName = profile.fullName || "there";
  const subject = "Welcome to Aroosi – Your profile has been created";
  const body = `
    <h1 style="margin-top:0;">🎉 Welcome to the Aroosi family, ${fullName}!</h1>
    <p style="font-size:16px; line-height:1.6;">Your account is now active.  It only takes a few minutes to make your profile shine:</p>
    <ul style="font-size:15px; line-height:1.6; padding-left:20px;">
      <li>Add a couple of recent photos</li>
      <li>Tell the community a bit about yourself</li>
      <li>Set your preferences so we can surface the best matches</li>
    </ul>
    <p style="font-size:16px; line-height:1.6;">When you're ready, our search page is waiting for you ✨</p>
    <a href="https://aroosi.app/create-profile" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:12px 20px;border-radius:6px;text-decoration:none;">Complete my profile</a>
  `;
  return { subject, html: wrapEmailContent(subject, body) };
}

// 2. Profile approved (user)
export function profileApprovedTemplate(profile: Profile): EmailPayload {
  const subject = "Your Aroosi profile has been approved";
  const body = `
    <h1 style="margin-top:0;">✅ Your profile is now live!</h1>
    <p style="font-size:16px; line-height:1.6;">Hi ${profile.fullName}, our moderators just approved your profile.  Members can now discover &amp; message you.</p>
    <p style="font-size:16px; line-height:1.6;">Tips for success:</p>
    <ul style="font-size:15px; line-height:1.6; padding-left:20px;">
      <li>Be genuine and polite in conversations</li>
      <li>Upload at least 3 photos to get 5× more views</li>
      <li>Keep your profile updated – it boosts you in search</li>
    </ul>
    <a href="https://aroosi.app/search" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:12px 20px;border-radius:6px;text-decoration:none;">Find Matches</a>
  `;
  return { subject, html: wrapEmailContent(subject, body) };
}

// 3. Profile banned / unbanned notification (user)
export function profileBanStatusTemplate(options: {
  profile: Profile;
  banned: boolean;
  reason?: string;
}): EmailPayload {
  const { profile, banned, reason } = options;
  const subject = banned
    ? "Your Aroosi profile has been banned"
    : "Your Aroosi profile is active again";
  const body = banned
    ? `<h1>Profile Banned</h1>
       <p>Hi ${profile.fullName || "there"},</p>
       <p>Unfortunately, your profile has been banned due to a violation of our community guidelines.</p>
       ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
       <p>If you believe this is a mistake, please reply to this email.</p>`
    : `<h1 style="margin-top:0;">🎉 You're back online!</h1>
       <p style="font-size:16px; line-height:1.6;">Hi ${profile.fullName || "there"}, your profile is active once more and ready to be discovered.</p>`;
  return { subject, html: wrapEmailContent(subject, body) };
}

// 4. New match (user)
export function newMatchTemplate(options: {
  fullName: string;
  matchName: string;
}): EmailPayload {
  const { fullName, matchName } = options;
  const subject = `You've matched with ${matchName} on Aroosi!`;
  const body = `
    <h1 style="margin-top:0;">💖 It's a Match!</h1>
    <p style="font-size:16px; line-height:1.6;">Hi ${fullName},</p>
    <p style="font-size:16px; line-height:1.6;">You and <strong>${matchName}</strong> liked each other – exciting!  Send a friendly hello and break the ice.</p>
    <a href="https://aroosi.app/matches" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:12px 20px;border-radius:6px;text-decoration:none;">Open Chat</a>
  `;
  return { subject, html: wrapEmailContent(subject, body) };
}

// 5. New message (user)
export function newMessageTemplate(options: {
  receiverName: string;
  senderName: string;
  preview: string;
}): EmailPayload {
  const { receiverName, senderName, preview } = options;
  const subject = `New message from ${senderName} on Aroosi`;
  const body = `
    <h1 style="margin-top:0;">📬 You've got mail!</h1>
    <p style="font-size:16px; line-height:1.6;">Hi ${receiverName}, <strong>${senderName}</strong> just sent you a message:</p>
    <blockquote style="font-size:15px; line-height:1.6; border-left:4px solid #BFA67A; margin:16px 0; padding-left:12px;">${preview}</blockquote>
    <p style="font-size:16px; line-height:1.6;">Don't keep them waiting – jump back into the conversation.</p>
    <a href="https://aroosi.app/messages" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:12px 20px;border-radius:6px;text-decoration:none;">Reply Now</a>
  `;
  return { subject, html: wrapEmailContent(subject, body) };
}

// 6. Contact form submission (admin)
export function contactFormAdminTemplate(options: {
  name: string;
  email: string;
  message: string;
}): EmailPayload {
  const { name, email, message } = options;
  const subject = `New contact form submission from ${name}`;
  const body = `
    <h1 style="margin-top:0;">📥 New contact enquiry</h1>
    <p style="font-size:16px; line-height:1.6;">Someone just reached out via the website contact form. Details below:</p>
    <table style="font-size:15px; line-height:1.6; width:100%; border-collapse:collapse;">
      <tr><td style="padding:6px; border:1px solid #eee; width:120px;"><strong>Name</strong></td><td style="padding:6px; border:1px solid #eee;">${name}</td></tr>
      <tr><td style="padding:6px; border:1px solid #eee;"><strong>Email</strong></td><td style="padding:6px; border:1px solid #eee;">${email}</td></tr>
      <tr><td style="padding:6px; border:1px solid #eee; vertical-align:top;"><strong>Message</strong></td><td style="padding:6px; border:1px solid #eee; white-space:pre-wrap;">${message}</td></tr>
    </table>
    <p style="font-size:14px; color:#666;">Respond directly to this email to reply to the user.</p>
  `;
  return { subject, html: wrapEmailContent(subject, body) };
}

// 7. Subscription plan change (user)
export function subscriptionChangedTemplate(options: {
  fullName: string;
  newPlan: string;
}): EmailPayload {
  const { fullName, newPlan } = options;
  const subject = `Your subscription has been updated to ${newPlan}`;
  const body = `
    <h1 style="margin-top:0;">⭐ Your plan has been updated!</h1>
    <p style="font-size:16px; line-height:1.6;">Hi ${fullName}, you've switched to <strong>${newPlan}</strong>.  Enjoy your new benefits and extra visibility.</p>
    <a href="https://aroosi.app/premium-settings" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:12px 20px;border-radius:6px;text-decoration:none;">See My Benefits</a>
  `;
  return { subject, html: wrapEmailContent(subject, body) };
}

// 8. Contact form acknowledgement (user)
export function contactFormUserAckTemplate(options: {
  name: string;
}): EmailPayload {
  const { name } = options;
  const subject = "We've received your message – Aroosi Support";
  const body = `
    <h1 style="margin-top:0;">👋 Thanks for reaching out, ${name}!</h1>
    <p style="font-size:16px; line-height:1.6;">We've received your message and one of our team members will get back to you within 24&nbsp;hours (usually sooner).</p>
    <p style="font-size:16px; line-height:1.6;">In the meantime you can browse our <a href="https://aroosi.app/faq" style="color:#BFA67A;">FAQ section</a> or continue discovering matches.</p>
    <a href="https://aroosi.app/search" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:12px 20px;border-radius:6px;text-decoration:none;">Continue on Aroosi</a>
  `;
  return { subject, html: wrapEmailContent(subject, body) };
}

// Admin: Profile created notification
export function profileCreatedAdminTemplate(profile: Profile): EmailPayload {
  const subject = `New profile created: ${profile.fullName}`;
  const body = `
    <h1 style="margin-top:0;">👤 New Profile Created</h1>
    <p style="font-size:16px; line-height:1.6;">A new user has created a profile on Aroosi.</p>
    <ul style="font-size:15px; line-height:1.6; padding-left:20px;">
      <li><strong>Name:</strong> ${profile.fullName}</li>
      <li><strong>Email:</strong> ${profile.email}</li>
      <li><strong>City:</strong> ${profile.city}</li>
      <li><strong>Date of Birth:</strong> ${profile.dateOfBirth}</li>
    </ul>
    <p style="font-size:16px; line-height:1.6;">Review and approve this profile in the admin dashboard.</p>
  `;
  return { subject, html: wrapEmailContent(subject, body) };
}

// Admin: Subscription purchased notification
export function subscriptionPurchasedAdminTemplate(profile: Profile, plan: string): EmailPayload {
  const subject = `New subscription: ${profile.fullName} purchased ${plan}`;
  const body = `
    <h1 style="margin-top:0;">💳 New Subscription Purchased</h1>
    <p style="font-size:16px; line-height:1.6;">A user has purchased a subscription plan.</p>
    <ul style="font-size:15px; line-height:1.6; padding-left:20px;">
      <li><strong>Name:</strong> ${profile.fullName}</li>
      <li><strong>Email:</strong> ${profile.email}</li>
      <li><strong>Plan:</strong> ${plan}</li>
    </ul>
    <p style="font-size:16px; line-height:1.6;">Check the admin dashboard for more details.</p>
  `;
  return { subject, html: wrapEmailContent(subject, body) };
}

// Export a union type if helpful for future dynamic template selection
export type EmailTemplateFn = (...args: unknown[]) => EmailPayload;
