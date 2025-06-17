import { sendAdminNotification, sendUserNotification } from "@/lib/email";
import {
  profileCreatedTemplate,
  profileApprovedTemplate,
  profileBanStatusTemplate,
  newMatchTemplate,
  newMessageTemplate,
  subscriptionChangedTemplate,
  contactFormAdminTemplate,
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

  async contactAdmin(name: string, email: string, message: string) {
    const { subject, html } = contactFormAdminTemplate({
      name,
      email,
      message,
    });
    await sendAdminNotification(subject, html);
  },
};
