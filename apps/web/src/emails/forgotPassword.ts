export function forgotPasswordEmailHtml(resetUrl: string): string {
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
                <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111;">Password reset requested</h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444">
                  We received a request to reset your password. If this was you, click the button below to continue. If not, you can safely ignore this email.
                </p>
                <a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px">Reset password</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px;text-align:center;border-top:1px solid #f0f0f0;font-size:11px;color:#777">
                Link expires in 60 minutes.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}


