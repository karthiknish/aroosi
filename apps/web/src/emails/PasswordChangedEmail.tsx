import React from "react";
import { EmailContainer } from "./WelcomeEmail";

export function PasswordChangedEmail({ loginUrl }: { loginUrl: string }) {
  return (
    <EmailContainer>
      <h1 style={{ margin: 0, marginBottom: 8, fontSize: 20, lineHeight: 1.3, color: "#111" }}>Your password was changed</h1>
      <p style={{ margin: 0, marginBottom: 12, fontSize: 14, lineHeight: 1.6, color: "#444" }}>
        This is a confirmation that your Aroosi account password was just changed.
      </p>
      <p style={{ margin: 0, marginBottom: 16, fontSize: 13, lineHeight: 1.6, color: "#666" }}>
        If you made this change, no further action is needed. If you didn’t, please reset your password immediately and
        contact support.
      </p>
      <a href={loginUrl} style={{ display: "inline-block", background: "#111", color: "#fff", textDecoration: "none", padding: "10px 14px", borderRadius: 10, fontSize: 14 }}>Go to Aroosi</a>
    </EmailContainer>
  );
}


