import React from "react";
import { EmailContainer } from "./WelcomeEmail";

export function SubscriptionReceiptEmail({
  plan,
  amount,
  currency,
  periodStart,
  periodEnd,
  invoiceUrl,
}: {
  plan: string;
  amount: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  invoiceUrl?: string;
}) {
  return (
    <EmailContainer>
      <h1 style={{ margin: 0, marginBottom: 8, fontSize: 20, lineHeight: 1.3, color: "#111" }}>Your subscription receipt</h1>
      <p style={{ margin: 0, marginBottom: 12, fontSize: 14, lineHeight: 1.6, color: "#444" }}>
        Thank you for your purchase. Here are your subscription details:
      </p>
      <ul style={{ margin: 0, marginBottom: 16, paddingLeft: 18, color: "#444", fontSize: 14, lineHeight: 1.6 }}>
        <li>Plan: {plan}</li>
        <li>Amount: {amount} {currency}</li>
        <li>Period: {periodStart} – {periodEnd}</li>
      </ul>
      {invoiceUrl ? (
        <a href={invoiceUrl} style={{ display: "inline-block", background: "#111", color: "#fff", textDecoration: "none", padding: "10px 14px", borderRadius: 10, fontSize: 14 }}>View Invoice</a>
      ) : null}
    </EmailContainer>
  );
}


