import React from "react";
import { EmailContainer } from "./WelcomeEmail";

export function ResetPasswordEmail({ resetUrl }: { resetUrl: string }) {
  return (
    <EmailContainer>
      <h1 style={{ margin: 0, marginBottom: 8, fontSize: 20, lineHeight: 1.3, color: "#111" }}>Reset your password</h1>
      <p style={{ margin: 0, marginBottom: 16, fontSize: 14, lineHeight: 1.6, color: "#444" }}>
        Click the button below to reset your password. If you didn’t request this, you can ignore this email.
      </p>
      <a href={resetUrl} style={{ display: "inline-block", background: "#111", color: "#fff", textDecoration: "none", padding: "10px 14px", borderRadius: 10, fontSize: 14 }}>Reset password</a>
      <p style={{ marginTop: 16, fontSize: 11, color: "#777" }}>Link expires in 60 minutes.</p>
    </EmailContainer>
  );
}


