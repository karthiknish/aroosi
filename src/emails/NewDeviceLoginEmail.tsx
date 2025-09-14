import React from "react";
import { EmailContainer } from "./WelcomeEmail";

export function NewDeviceLoginEmail({ device, location, time, manageUrl }: { device: string; location?: string; time: string; manageUrl: string }) {
  return (
    <EmailContainer>
      <h1 style={{ margin: 0, marginBottom: 8, fontSize: 20, lineHeight: 1.3, color: "#111" }}>New login to your account</h1>
      <p style={{ margin: 0, marginBottom: 12, fontSize: 14, lineHeight: 1.6, color: "#444" }}>
        There was a new sign-in to your Aroosi account.
      </p>
      <ul style={{ margin: 0, marginBottom: 16, paddingLeft: 18, color: "#444", fontSize: 14, lineHeight: 1.6 }}>
        <li>Device: {device}</li>
        {location ? <li>Location: {location}</li> : null}
        <li>Time: {time}</li>
      </ul>
      <a href={manageUrl} style={{ display: "inline-block", background: "#111", color: "#fff", textDecoration: "none", padding: "10px 14px", borderRadius: 10, fontSize: 14 }}>Manage sessions</a>
    </EmailContainer>
  );
}


