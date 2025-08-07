import "server-only";
/*
Email template helpers for major Aroosi site events.
Each helper returns an object with `subject` and `html` keys that can be passed directly to
`sendUserNotification` / `sendAdminNotification` utilities defined in email.ts.
All emails use <contact@aroosi.app> as the "from" address via the default in sendEmail().
*/

import { Profile } from "@/types/profile";
import { renderEmail } from "@/lib/renderEmail";
import { EmailContainer } from "@/emails/WelcomeEmail";

type EmailPayload = {
  subject: string;
  html: string;
};

// Shared wrapper with clean, modern, minimal styling
function wrapEmailContent(_title: string, body: string): string {
  return renderEmail(
    <EmailContainer>
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <div style={{ marginTop: 16, fontSize: 11, color: "#777", borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>
        You’re receiving this because you have an Aroosi account.
      </div>
    </EmailContainer>
  );
}

// 1. Profile created (user)
export function profileCreatedTemplate(profile: Profile): EmailPayload {
  const fullName = profile.fullName || "there";
  const subject = "Welcome to Aroosi – Your profile has been created";
  const body = `
    <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111">Welcome to Aroosi, ${fullName}!</h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444">Your account is ready. A few quick steps will help your profile shine:</p>
    <ul style="margin:0 0 16px 18px;padding:0;color:#444;font-size:14px;line-height:1.6">
      <li>Add a couple of recent photos</li>
      <li>Share a short bio</li>
      <li>Set your preferences</li>
    </ul>
    <a href="https://aroosi.app/profile/create" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px">Complete my profile</a>
  `;
  return { subject, html: wrapEmailContent(subject, body) };
}

// 2. Profile approved (user)
export function profileApprovedTemplate(profile: Profile): EmailPayload {
  const subject = "Your Aroosi profile has been approved";
  const body = `
    <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111">Your profile is live</h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444">Hi ${profile.fullName}, our moderators approved your profile. Members can now discover and message you.</p>
    <ul style="margin:0 0 16px 18px;padding:0;color:#444;font-size:14px;line-height:1.6">
      <li>Be genuine and polite</li>
      <li>Upload at least 3 photos</li>
      <li>Keep your profile updated</li>
    </ul>
    <a href="https://aroosi.app/search" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px">Find matches</a>
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
    ? `<h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111">Profile banned</h1>
       <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#444">Hi ${profile.fullName || "there"}, your profile has been banned due to violations of our community guidelines.</p>
       ${reason ? `<p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#444"><strong>Reason:</strong> ${reason}</p>` : ""}
       <p style="margin:0 0 0 0;font-size:14px;line-height:1.6;color:#444">If you believe this is a mistake, reply to this email.</p>`
    : `<h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111">You’re back online</h1>
       <p style="margin:0 0 0 0;font-size:14px;line-height:1.6;color:#444">Hi ${profile.fullName || "there"}, your profile is active again and ready to be discovered.</p>`;
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
    <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111">It’s a match</h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444">Hi ${fullName}, you and <strong>${matchName}</strong> liked each other. Say hello and break the ice.</p>
    <a href="https://aroosi.app/matches" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px">Open chat</a>
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
    <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111">New message from ${senderName}</h1>
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#444">Hi ${receiverName}, you received a new message:</p>
    <blockquote style="margin:0 0 16px 0;padding:8px 12px;border-left:3px solid #111;color:#444;font-size:14px;line-height:1.6">${preview}</blockquote>
    <a href="https://aroosi.app/messages" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px">Reply now</a>
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
    <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111">New contact enquiry</h1>
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#444">A new contact form submission was received:</p>
    <table style="font-size:14px;line-height:1.6;width:100%;border-collapse:collapse">
      <tr><td style="padding:6px;border:1px solid #eee;width:120px"><strong>Name</strong></td><td style="padding:6px;border:1px solid #eee">${name}</td></tr>
      <tr><td style="padding:6px;border:1px solid #eee"><strong>Email</strong></td><td style="padding:6px;border:1px solid #eee">${email}</td></tr>
      <tr><td style="padding:6px;border:1px solid #eee;vertical-align:top"><strong>Message</strong></td><td style="padding:6px;border:1px solid #eee;white-space:pre-wrap">${message}</td></tr>
    </table>
    <p style="margin:12px 0 0 0;font-size:12px;color:#777">Reply directly to this email to respond to the user.</p>
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
    <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111">Your plan has been updated</h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444">Hi ${fullName}, you’ve switched to <strong>${newPlan}</strong>. Enjoy your new benefits.</p>
    <a href="https://aroosi.app/premium-settings" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px">See my benefits</a>
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
    <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111">Thanks for reaching out, ${name}</h1>
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#444">We received your message. We’ll get back to you within 24 hours.</p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444">Meanwhile, you can browse our <a href="https://aroosi.app/faq" style="color:#111">FAQ</a> or continue discovering matches.</p>
    <a href="https://aroosi.app/search" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px">Continue on Aroosi</a>
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
export function subscriptionPurchasedAdminTemplate(
  profile: Profile,
  plan: string
): EmailPayload {
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

// 9. Recommended profiles (user)
export function recommendedProfilesTemplate(options: {
  fullName: string;
  profiles: Array<{
    id: string;
    fullName: string;
    city: string;
    country: string;
    profileImageUrl: string;
    compatibilityScore: number;
    aboutMe: string;
  }>;
}): EmailPayload {
  const { fullName, profiles } = options;
  const subject = `New matches for you on Aroosi – ${profiles.length} recommended profiles`;

  // Generate profile cards HTML
  const profileCards = profiles
    .map(
      (profile) => `
    <div style="border:1px solid #eee;border-radius:12px;overflow:hidden;margin-bottom:16px;background:#fff">
      <div style="display:flex;padding:16px;gap:16px">
        <div style="flex:0 0 80px">
          <img src="${profile.profileImageUrl}" alt="${profile.fullName}" style="width:80px;height:80px;border-radius:10px;object-fit:cover" />
        </div>
        <div style="flex:1">
          <h3 style="margin:0 0 6px 0;font-size:16px;color:#111">${profile.fullName}</h3>
          <p style="margin:0 0 6px 0;color:#666;font-size:13px">${profile.city}, ${profile.country}</p>
          <p style="margin:0 0 6px 0;color:#777;font-size:12px">Compatibility: ${profile.compatibilityScore}%</p>
          <p style="margin:0;color:#444;font-size:13px;line-height:1.5">${profile.aboutMe.substring(0, 120)}${profile.aboutMe.length > 120 ? "..." : ""}</p>
        </div>
      </div>
      <div style="padding:0 16px 16px">
        <a href="https://aroosi.app/profile/${profile.id}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:8px 12px;border-radius:10px;font-size:13px">View profile</a>
      </div>
    </div>
  `
    )
    .join("");

  const body = `
    <h1 style="margin-top:0;">🌟 New Matches for You!</h1>
    <p style="font-size:16px; line-height:1.6;">Hi ${fullName}, we've found some great potential matches based on your preferences. Check out these recommended profiles:</p>
    
    ${profileCards}
    
    <p style="font-size:16px; line-height:1.6; margin-top:24px;">Don't miss out on connecting with these amazing people. The best relationships start with a simple hello.</p>
    <a href="https://aroosi.app/search" style="display:inline-block; background:#BFA67A; color:#ffffff!important; padding:12px 20px; border-radius:6px; text-decoration:none;">See More Matches</a>
  `;

  return { subject, html: wrapEmailContent(subject, body) };
}

// Export a union type if helpful for future dynamic template selection
export type EmailTemplateFn = (...args: unknown[]) => EmailPayload;


