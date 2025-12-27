import {
  sendAdminNotification,
  sendUserNotification,
  sendCategorizedUserEmail,
} from "@/lib/email";
import {
  profileCreatedTemplate,
  profileApprovedTemplate,
  profileBanStatusTemplate,
  newMatchTemplate,
  newMessageTemplate,
  subscriptionChangedTemplate,
  subscriptionReceiptTemplate,
  trialStartedTemplate,
  trialEndingTemplate,
  renewalSuccessTemplate,
  renewalFailureTemplate,
  subscriptionCancelledTemplate,
  refundIssuedTemplate,
  planExpiredTemplate,
  contactFormAdminTemplate,
  profileCreatedAdminTemplate,
  subscriptionPurchasedAdminTemplate,
  unreadMessageReminderTemplate,
  messagesDigestTemplate,
} from "@/lib/emailTemplates";
import type { Profile } from "@aroosi/shared/types";

export const Notifications = {
  async profileCreated(userEmail: string, profile: Profile) {
    const { subject, html } = profileCreatedTemplate(profile);
    await sendCategorizedUserEmail(
      userEmail,
      subject,
      html,
      "welcome",
      "Your Aroosi account is ready"
    );
  },

  async profileApproved(userEmail: string, profile: Profile) {
    const { subject, html } = profileApprovedTemplate(profile);
    await sendUserNotification(userEmail, subject, html);
  },

  async profileBanStatus(
    userEmail: string,
    opts: {
      profile: Profile;
      banned: boolean;
      reason?: string;
      appealUrl?: string;
    }
  ) {
    const { subject, html } = profileBanStatusTemplate(opts);
    await sendUserNotification(userEmail, subject, html);
  },

  async newMatch(userEmail: string, fullName: string, matchName: string) {
    const { subject, html } = newMatchTemplate({ fullName, matchName });
    await sendUserNotification(userEmail, subject, html);
  },

  async newMessage(
    receiverEmail: string,
    receiverName: string,
    senderName: string,
    preview: string
  ) {
    const { subject, html } = newMessageTemplate({
      receiverName,
      senderName,
      preview,
    });
    await sendUserNotification(receiverEmail, subject, html);
  },

  async subscriptionChanged(
    userEmail: string,
    fullName: string,
    newPlan: string
  ) {
    const { subject, html } = subscriptionChangedTemplate({
      fullName,
      newPlan,
    });
    await sendUserNotification(userEmail, subject, html);
  },

  async subscriptionReceipt(
    userEmail: string,
    opts: {
      fullName: string;
      plan: string;
      amountCents?: number;
      currency?: string;
      invoiceUrl?: string;
      expiresAt?: number | null;
    }
  ) {
    const { subject, html } = subscriptionReceiptTemplate(opts);
    await sendCategorizedUserEmail(
      userEmail,
      subject,
      html,
      "billing",
      `Receipt for your ${opts.plan} plan`
    );
  },

  async trialStarted(
    userEmail: string,
    opts: { fullName: string; plan: string; trialEnd: number }
  ) {
    const { subject, html } = trialStartedTemplate(opts);
    await sendUserNotification(userEmail, subject, html);
  },

  async trialEnding(
    userEmail: string,
    opts: { fullName: string; plan: string; trialEnd: number }
  ) {
    const { subject, html } = trialEndingTemplate(opts);
    await sendUserNotification(userEmail, subject, html);
  },

  async renewalSuccess(
    userEmail: string,
    opts: {
      fullName: string;
      plan: string;
      periodEnd?: number;
      invoiceUrl?: string;
    }
  ) {
    const { subject, html } = renewalSuccessTemplate(opts);
    await sendCategorizedUserEmail(
      userEmail,
      subject,
      html,
      "billing",
      `${opts.plan} renewed successfully`
    );
  },

  async renewalFailure(
    userEmail: string,
    opts: {
      fullName: string;
      plan: string;
      reason?: string;
      updateUrl?: string;
    }
  ) {
    const { subject, html } = renewalFailureTemplate(opts);
    await sendCategorizedUserEmail(
      userEmail,
      subject,
      html,
      "billing",
      "Payment issue with your subscription"
    );
  },

  async subscriptionCancelled(
    userEmail: string,
    opts: { fullName: string; plan: string; effectiveDate?: number }
  ) {
    const { subject, html } = subscriptionCancelledTemplate(opts);
    await sendCategorizedUserEmail(
      userEmail,
      subject,
      html,
      "billing",
      `${opts.plan} cancelled`
    );
  },

  async refundIssued(
    userEmail: string,
    opts: { fullName: string; amountCents?: number; currency?: string }
  ) {
    const { subject, html } = refundIssuedTemplate(opts);
    await sendUserNotification(userEmail, subject, html);
  },

  async planExpired(
    userEmail: string,
    opts: { fullName: string; plan: string }
  ) {
    const { subject, html } = planExpiredTemplate(opts);
    await sendUserNotification(userEmail, subject, html);
  },

  // Unread message reminder (opt-in)
  async unreadMessageReminder(
    userEmail: string,
    opts: { fullName: string; unreadCount: number }
  ) {
    const { subject, html } = unreadMessageReminderTemplate(opts);
    await sendCategorizedUserEmail(
      userEmail,
      subject,
      html,
      "messages",
      "You have unread messages"
    );
  },

  // Messages digest (daily/weekly, opt-in)
  async messagesDigest(
    userEmail: string,
    opts: {
      fullName: string;
      period: "daily" | "weekly";
      unreadCount?: number;
      newMatchesCount?: number;
      previews?: Array<{ from: string; snippet: string }>;
    }
  ) {
    const { subject, html } = messagesDigestTemplate(opts);
    await sendCategorizedUserEmail(
      userEmail,
      subject,
      html,
      "messages",
      `${opts.period === "daily" ? "Daily" : "Weekly"} summary`
    );
  },

  async contactAdmin(name: string, email: string, message: string) {
    const { subject, html } = contactFormAdminTemplate({
      name,
      email,
      message,
    });
    await sendAdminNotification(subject, html);
  },

  async profileCreatedAdmin(profile: Profile) {
    const { subject, html } = profileCreatedAdminTemplate(profile);
    await sendAdminNotification(subject, html);
  },

  async subscriptionPurchasedAdmin(profile: Profile, plan: string) {
    const { subject, html } = subscriptionPurchasedAdminTemplate(profile, plan);
    await sendAdminNotification(subject, html);
  },
};
