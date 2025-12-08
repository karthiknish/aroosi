import { sendUserNotification } from "@/lib/email";

export type CampaignPriority = "high" | "normal" | "low";

export type CampaignKind =
  | "marketing_general"
  | "product_updates"
  | "promotions"
  | "onboarding"
  | "reengagement";

export interface CampaignDefaults {
  listId: string;
  tags: Array<string> | Array<{ name: string; value: string }>;
  priority?: CampaignPriority;
  category?: string; // for unsubscribe categories
}

const DEFAULTS: Record<CampaignKind, CampaignDefaults> = {
  marketing_general: {
    listId: "marketing.aroosi.app",
    tags: ["marketing"],
    priority: "normal",
    category: "marketing",
  },
  product_updates: {
    listId: "updates.aroosi.app",
    tags: ["updates"],
    priority: "normal",
    category: "product",
  },
  promotions: {
    listId: "promotions.aroosi.app",
    tags: ["promo"],
    priority: "high",
    category: "marketing",
  },
  onboarding: {
    listId: "onboarding.aroosi.app",
    tags: ["onboarding"],
    priority: "normal",
    category: "lifecycle",
  },
  reengagement: {
    listId: "reengagement.aroosi.app",
    tags: ["reengagement"],
    priority: "normal",
    category: "marketing",
  },
};

export function getCampaignDefaults(kind: CampaignKind): CampaignDefaults {
  return DEFAULTS[kind];
}

export async function sendCampaignEmail(
  kind: CampaignKind,
  email: string,
  subject: string,
  htmlOrReact: string | unknown,
  opts?: {
    preheader?: string;
    campaignId?: string;
    abVariant?: "A" | "B";
    headers?: Record<string, string>;
    tags?: Array<string> | Array<{ name: string; value: string }>;
    cc?: string[];
    bcc?: string[];
    replyTo?: string | string[];
    attachments?: Array<{
      filename: string;
      content?: string | Buffer;
      contentType?: string;
      path?: string;
      contentId?: string;
    }>;
    scheduledAt?: number;
    text?: string;
    from?: string;
    fromEmail?: string;
    fromName?: string;
    generateTextFromHtml?: boolean;
    priority?: CampaignPriority;
    listId?: string;
    idempotencyKey?: string;
    inReplyTo?: string;
    references?: string | string[];
    messageId?: string;
  }
) {
  const d = getCampaignDefaults(kind);
  const listId = opts?.listId ?? d.listId;
  const tags = opts?.tags ?? d.tags;
  const priority = opts?.priority ?? d.priority;
  const category = d.category;

  return sendUserNotification(email, subject, htmlOrReact, {
    preheader: opts?.preheader,
    category,
    campaignId: opts?.campaignId,
    headers: opts?.headers,
    tags,
    abVariant: opts?.abVariant,
    cc: opts?.cc,
    bcc: opts?.bcc,
    replyTo: opts?.replyTo,
    attachments: opts?.attachments,
    scheduledAt: opts?.scheduledAt,
    text: opts?.text,
    from: opts?.from,
    fromEmail: opts?.fromEmail,
    fromName: opts?.fromName,
    generateTextFromHtml: opts?.generateTextFromHtml,
    priority,
    listId,
    idempotencyKey: opts?.idempotencyKey,
    inReplyTo: opts?.inReplyTo,
    references: opts?.references,
    messageId: opts?.messageId,
  });
}
