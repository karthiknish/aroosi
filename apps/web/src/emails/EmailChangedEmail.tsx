import React from "react";
import { EmailContainer } from "./WelcomeEmail";

export function EmailChangedEmail({ oldEmail, newEmail, manageUrl }: { oldEmail: string; newEmail: string; manageUrl: string }) {
  return (
    <EmailContainer>
      <h1 style={{ margin: 0, marginBottom: 8, fontSize: 20, lineHeight: 1.3, color: "#111" }}>Your email was changed</h1>
      <p style={{ margin: 0, marginBottom: 12, fontSize: 14, lineHeight: 1.6, color: "#444" }}>
        The email address on your Aroosi account was changed from <strong>{oldEmail}</strong> to <strong>{newEmail}</strong>.
      </p>
      <p style={{ margin: 0, marginBottom: 16, fontSize: 13, lineHeight: 1.6, color: "#666" }}>
        If you made this change, no action is needed. If you didn’t, please secure your account immediately.
      </p>
      <a href={manageUrl} style={{ display: "inline-block", background: "#111", color: "#fff", textDecoration: "none", padding: "10px 14px", borderRadius: 10, fontSize: 14 }}>Manage account</a>
    </EmailContainer>
  );
}


