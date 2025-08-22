import { sendAdminNotification, sendUserNotification } from "@/lib/email";
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
import { Profile } from "@/types/profile";

export const Notifications = {
  async profileCreated(userEmail: string, profile: Profile) {
    const { subject, html } = profileCreatedTemplate(profile);
    await sendUserNotification(userEmail, subject, html);
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
    await sendUserNotification(userEmail, subject, html);
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
    await sendUserNotification(userEmail, subject, html);
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
    await sendUserNotification(userEmail, subject, html);
  },

  async subscriptionCancelled(
    userEmail: string,
    opts: { fullName: string; plan: string; effectiveDate?: number }
  ) {
    const { subject, html } = subscriptionCancelledTemplate(opts);
    await sendUserNotification(userEmail, subject, html);
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
    await sendUserNotification(userEmail, subject, html);
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
    await sendUserNotification(userEmail, subject, html);
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
