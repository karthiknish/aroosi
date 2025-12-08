import React from "react";

const brandGold = "#BFA67A";

export function BaseMarketingEmail({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Aroosi</title>
        <style>{`@media only screen and (max-width: 600px) { .container { width: 100% !important; } } a.btn:hover { opacity: .9; }`}</style>
      </head>
      <body style={{ margin: 0, padding: 0, background: "#faf7f2", fontFamily: "Nunito Sans,Helvetica,Arial,sans-serif", color: "#222" }}>
        <table role="presentation" width="100%" cellSpacing={0} cellPadding={0} style={{ background: "#faf7f2", padding: "24px 0" }}>
          <tbody>
            <tr>
              <td align="center">
                <table role="presentation" width={600} className="container" cellSpacing={0} cellPadding={0} style={{ width: 600, maxWidth: 600, background: "#ffffff", border: `1px solid ${brandGold}`, borderRadius: 8, overflow: "hidden" }}>
                  <tbody>
                    <tr>
                      <td style={{ background: brandGold, padding: 24, textAlign: "center" }}>
                        <img src="https://aroosi.app/logo.png" alt="Aroosi" width={120} style={{ display: "block", margin: "0 auto" }} />
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "32px 24px" }}>{children}</td>
                    </tr>
                    <tr>
                      <td style={{ background: "#f5f5f5", padding: 20, textAlign: "center", fontSize: 12, color: "#666" }}>
                        {footer}
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


