import { NextRequest } from "next/server";
import React from "react";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { render as renderEmail } from "@react-email/render";
import { PasswordChangedEmail } from "@/emails/PasswordChangedEmail";
import { EmailChangedEmail } from "@/emails/EmailChangedEmail";
import { NewDeviceLoginEmail } from "@/emails/NewDeviceLoginEmail";
import { SubscriptionReceiptEmail } from "@/emails/SubscriptionReceiptEmail";

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    const body = await request.json().catch(()=> ({}));
    const kind = String(body?.kind || 'passwordChanged');
    const vars = body?.vars || {};
    let html = '';
    if (kind === 'passwordChanged') {
      html = await renderEmail(React.createElement(PasswordChangedEmail as any, { loginUrl: vars.loginUrl || '#' }));
    } else if (kind === 'emailChanged') {
      html = await renderEmail(
        React.createElement(EmailChangedEmail as any, {
          oldEmail: vars.oldEmail || 'old@example.com',
          newEmail: vars.newEmail || 'new@example.com',
          manageUrl: vars.manageUrl || '#',
        })
      );
    } else if (kind === 'newDevice') {
      html = await renderEmail(
        React.createElement(NewDeviceLoginEmail as any, {
          device: vars.device || 'Chrome',
          location: vars.location,
          time: vars.time || new Date(nowTimestamp()).toISOString(),
          manageUrl: vars.manageUrl || '#',
        })
      );
    } else if (kind === 'subscriptionReceipt') {
      html = await renderEmail(
        React.createElement(SubscriptionReceiptEmail as any, {
          plan: vars.plan || 'Premium',
          amount: vars.amount || '9.99',
          currency: vars.currency || 'USD',
          periodStart: vars.periodStart || '',
          periodEnd: vars.periodEnd || '',
          invoiceUrl: vars.invoiceUrl,
        })
      );
    }
    else return errorResponse('Unknown kind', 400);
    return successResponse({ html });
  } catch (e) {
    return errorResponse('Failed to render preview', 500);
  }
}


