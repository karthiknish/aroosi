import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(
  email: string,
  otp: string
): Promise<boolean> {
  // Keeping for backwards compatibility if OTP is still used anywhere.
  // Minimal, clean design.
  try {
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Your Aroosi verification code",
      html: `<!doctype html>
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
              <td style="padding:28px 24px 8px 24px">
                <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111;">Verify your email</h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444">Use the code below to finish signing up.</p>
                <div style="display:inline-block;padding:12px 16px;border-radius:10px;background:#111;color:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:20px;letter-spacing:6px">${otp}</div>
                <p style="margin:16px 0 0 0;font-size:12px;color:#666">The code expires in 10 minutes.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px;text-align:center;border-top:1px solid #f0f0f0;font-size:11px;color:#777">
                You’re receiving this because you created an Aroosi account.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    });
    return true;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return false;
  }
}

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Welcome to Aroosi",
      html: `<!doctype html>
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
                <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111;">Welcome, ${name}!</h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444">
                  We’re glad you’re here. Set up your profile to get the best matches.
                </p>
                <ul style="margin:0 0 16px 18px;padding:0;color:#444;font-size:14px;line-height:1.6">
                  <li>Add a few recent photos</li>
                  <li>Tell us about yourself</li>
                  <li>Set your preferences</li>
                </ul>
                <a href="https://aroosi.app/profile/create" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px">Complete your profile</a>
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
</html>`,
    });
    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
}

/**
 * Send a password reset link email pointing users to the reset page.
 */
export async function sendResetLinkEmail(
  email: string,
  resetUrl: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Reset your Aroosi password",
      html: `<!doctype html>
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
                <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111;">Reset your password</h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444">
                  Click the button below to reset your password. If you didn’t request this, you can ignore this email.
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
</html>`,
    });
    return true;
  } catch (error) {
    console.error("Failed to send reset link email:", error);
    return false;
  }
}
