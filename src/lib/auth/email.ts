import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(
  email: string,
  otp: string,
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: "Aroosi <noreply@aroosi.app>",
      to: email,
      subject: "Your Aroosi Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #d90012, #BFA67A); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Aroosi</h1>
            <p style="color: white; margin: 5px 0;">Afghan Matrimony Platform</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email Address</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Thank you for signing up with Aroosi! Please use the verification code below to complete your registration:
            </p>
            
            <div style="background: white; border: 2px solid #BFA67A; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <h3 style="color: #d90012; font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h3>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
            </p>
            
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
