export function verifyEmailHtml(name: string, verifyUrl: string, expiresMinutes = 1440): string {
  const hours = Math.round(expiresMinutes / 60);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;background:#f5f5f5;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #eee;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;text-align:center;border-bottom:1px solid #f0f0f0;">
                <img src="https://aroosi.app/logo.png" alt="Aroosi" width="96" style="display:block;margin:0 auto 4px auto" />
                <div style="font-weight:600;letter-spacing:.3px;color:#555;font-size:13px">Aroosi</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px">
                <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.3;color:#111">Confirm your email</h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444">Hi ${name || "there"}, please confirm this is your email address so you can access all features on Aroosi.</p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444">Click the button below to verify. This link expires in ${hours} ${hours === 1 ? "hour" : "hours"}.</p>
                <div style="margin:24px 0">
                  <a href="${verifyUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:600">Verify Email</a>
                </div>
                <p style="margin:0 0 12px 0;font-size:12px;line-height:1.5;color:#666">If the button doesn't work, copy & paste this URL into your browser:</p>
                <p style="word-break:break-all;font-size:12px;line-height:1.4;color:#555;margin:0 0 16px 0">${verifyUrl}</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#888">If you didn't create an account, you can safely ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px;text-align:center;border-top:1px solid #f0f0f0;font-size:11px;color:#777">
                © ${new Date().getFullYear()} Aroosi
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
