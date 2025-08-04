import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(
  email: string,
  otp: string,
): Promise<boolean> {
  const brandGold = "#BFA67A";
  const brandRed = "#d90012";
  
  try {
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Your Aroosi Verification Code",
      html: `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Your Aroosi Verification Code</title>
      <style>
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; }
        }
        a.btn:hover { opacity: .9; }
      </style>
    </head>
    <body style="margin:0; padding:0; background:#faf7f2; font-family:'Nunito Sans',Helvetica,Arial,sans-serif; color:#222;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf7f2; padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" class="container" cellspacing="0" cellpadding="0" style="width:600px; max-width:600px; background:#ffffff; border:1px solid ${brandGold}; border-radius:8px; overflow:hidden;">
              <tr>
                <td style="background:${brandGold}; padding:24px; text-align:center;">
                  <img src="https://aroosi.app/logo.png" alt="Aroosi" width="120" style="display:block; margin:0 auto;" />
                </td>
              </tr>
              <tr>
                <td style="padding:32px 24px;">
                  <h1 style="margin-top:0; color:#222; font-size:24px;">Verify Your Email Address</h1>
                  <p style="font-size:16px; line-height:1.6; color:#666;">
                    Thank you for signing up with Aroosi! Please use the verification code below to complete your registration:
                  </p>
                  <div style="background:#f9f9f9; border-left:4px solid ${brandGold}; padding:20px; margin:25px 0; text-align:center;">
                    <h2 style="color:${brandRed}; font-size:32px; letter-spacing:8px; margin:0; font-family:monospace;">${otp}</h2>
                  </div>
                  <p style="font-size:16px; line-height:1.6; color:#666;">
                    This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#f5f5f5; padding:20px; text-align:center; font-size:12px; color:#666;">
                  You're receiving this email because you have an account on <strong>Aroosi</strong>.<br />
                  If you didn't expect this, please ignore it.
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
  name: string,
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Welcome to Aroosi!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #d90012, #BFA67A); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to Aroosi!</h1>
            <p style="color: white; margin: 5px 0;">Afghan Matrimony Platform</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${name}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Welcome to Aroosi, the trusted Afghan matrimony platform. We're excited to help you find your perfect match within our community.
            </p>
            
            <div style="background: white; border-left: 4px solid #BFA67A; padding: 20px; margin: 25px 0;">
              <h3 style="color: #d90012; margin-top: 0;">Next Steps:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>Complete your profile with photos and details</li>
                <li>Set your preferences for potential matches</li>
                <li>Start browsing and connecting with other members</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://aroosi.app/profile/create" style="background: #BFA67A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Complete Your Profile
              </a>
            </div>
            
            <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                © 2024 Aroosi. All rights reserved.<br>
                This is an automated message, please do not reply.
              </p>
            </div>
          </div>
        </div>
      `,
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
  resetUrl: string,
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Reset your Aroosi password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background:#fff; border:1px solid #BFA67A; border-radius:8px; overflow:hidden;">
          <div style="background:#BFA67A; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Reset your password</h1>
          </div>
          <div style="padding: 30px;">
            <p style="color: #333; line-height: 1.6; margin-bottom: 25px;">
              We received a request to reset your Aroosi account password. Click the button below to continue.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #d90012; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color:#666; font-size:14px;">
              If you did not request a password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send reset link email:", error);
    return false;
  }
}
