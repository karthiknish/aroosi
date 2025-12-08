import React from "react";
import { BaseMarketingEmail } from "./BaseMarketingEmail";

export function ProfileCompletionReminder({ name, completionPercentage, unsubscribeToken }: { name: string; completionPercentage: number; unsubscribeToken: string }) {
  const missingItems: string[] = [];
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
      <h1 style={{ marginTop: 0 }}>You&apos;re almost there! 🌟</h1>
      <p style={{ fontSize: 16, lineHeight: 1.6 }}>
        Hi {name}, complete profiles get <strong>5x more matches</strong>.
        You&apos;re currently at {completionPercentage}% completion.
      </p>
      <div
        style={{
          background: "#f9f9f9",
          padding: 20,
          borderRadius: 8,
          margin: "20px 0",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Quick wins to boost your profile:</h3>
        <ul style={{ fontSize: 15, lineHeight: 1.8, margin: 0 }}>
          {missingItems.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>
      <p style={{ fontSize: 16, lineHeight: 1.6 }}>
        It only takes 2 minutes to complete!
      </p>
      <a
        href="https://aroosi.app/profile/edit"
        className="btn"
        style={{
          display: "inline-block",
          background: "#BFA67A",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: 6,
          textDecoration: "none",
          fontWeight: "bold",
        }}
      >
        Complete My Profile
      </a>
    </BaseMarketingEmail>
  );
}


