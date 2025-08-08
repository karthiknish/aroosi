import React from "react";

export function EmailContainer({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#ffffff",
          fontFamily:
            "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
          color: "#111",
        }}
      >
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ padding: "24px 0", background: "#f5f5f5" }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  role="presentation"
                  width={560}
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    width: 560,
                    maxWidth: 560,
                    background: "#ffffff",
                    borderRadius: 12,
                    border: "1px solid #eee",
                    overflow: "hidden",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: "20px 24px",
                          textAlign: "center",
                          borderBottom: "1px solid #f0f0f0",
                        }}
                      >
                        {/* Email clients require <img>; Next.js Image is not applicable in emails */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="https://aroosi.app/logo.png"
                          alt="Aroosi"
                          width={96}
                          style={{
                            display: "block",
                            margin: "0 auto 4px auto",
                          }}
                        />
                        <div
                          style={{
                            fontWeight: 600,
                            letterSpacing: ".3px",
                            color: "#555",
                            fontSize: 13,
                          }}
                        >
                          Aroosi
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "28px 24px" }}>{children}</td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "20px 24px",
                          textAlign: "center",
                          borderTop: "1px solid #f0f0f0",
                          fontSize: 11,
                          color: "#777",
                        }}
                      >
                        © {new Date().getFullYear()} Aroosi
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function WelcomeEmail({ name }: { name: string }) {
  return (
    <EmailContainer>
      <h1 style={{ margin: 0, marginBottom: 8, fontSize: 20, lineHeight: 1.3, color: "#111" }}>Welcome, {name}!</h1>
      <p style={{ margin: 0, marginBottom: 16, fontSize: 14, lineHeight: 1.6, color: "#444" }}>
        We’re glad you’re here. Set up your profile to get the best matches.
      </p>
      <ul style={{ margin: 0, marginBottom: 16, paddingLeft: 18, color: "#444", fontSize: 14, lineHeight: 1.6 }}>
        <li>Add a few recent photos</li>
        <li>Tell us about yourself</li>
        <li>Set your preferences</li>
      </ul>
      <a href="https://aroosi.app/profile/create" style={{ display: "inline-block", background: "#111", color: "#fff", textDecoration: "none", padding: "10px 14px", borderRadius: 10, fontSize: 14 }}>Complete your profile</a>
    </EmailContainer>
  );
}


