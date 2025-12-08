import React from "react";
import { BaseMarketingEmail } from "./BaseMarketingEmail";

export function PremiumPromo({ name, discountPercentage, unsubscribeToken }: { name: string; discountPercentage: number; unsubscribeToken: string }) {
  return (
    <BaseMarketingEmail
      footer={
        <>
          You&apos;re receiving this email because you opted in to marketing
          communications from <strong>Aroosi</strong>.
          <br />
          <a
            href={`https://aroosi.app/unsubscribe?token=${unsubscribeToken}`}
            style={{ color: "#666", textDecoration: "underline" }}
          >
            Unsubscribe
          </a>
          {" | "}
          <a
            href={`https://aroosi.app/email-preferences?token=${unsubscribeToken}`}
            style={{ color: "#666", textDecoration: "underline" }}
          >
            Update preferences
          </a>
        </>
      }
    >
      <h1 style={{ marginTop: 0 }}>Exclusive Offer Just for You! 🎉</h1>
      <p style={{ fontSize: 16, lineHeight: 1.6 }}>
        Hi {name}, upgrade to Premium and save{" "}
        <strong>{discountPercentage}%</strong> today only!
      </p>
      <div
        style={{
          background: "#BFA67A",
          color: "white",
          padding: 30,
          borderRadius: 8,
          textAlign: "center",
          margin: "20px 0",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 36 }}>{discountPercentage}% OFF</h2>
        <p style={{ margin: "10px 0 0 0", fontSize: 18 }}>Premium Membership</p>
      </div>
      <h3>Premium Benefits Include:</h3>
      <ul style={{ fontSize: 15, lineHeight: 1.8 }}>
        <li>✅ Unlimited messaging</li>
        <li>✅ See who viewed your profile</li>
        <li>✅ Advanced search filters</li>
        <li>✅ Profile boost for 10x visibility</li>
        <li>✅ Priority customer support</li>
      </ul>
      <p style={{ fontSize: 14, color: "#666", textAlign: "center" }}>
        <em>Offer expires at midnight tonight!</em>
      </p>
      <div style={{ textAlign: "center" }}>
        <a
          href="https://aroosi.app/pricing"
          className="btn"
          style={{
            display: "inline-block",
            background: "#BFA67A",
            color: "#ffffff",
            padding: "14px 32px",
            borderRadius: 6,
            textDecoration: "none",
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          Claim My Discount
        </a>
      </div>
    </BaseMarketingEmail>
  );
}


