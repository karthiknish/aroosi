import * as React from 'react';

interface OtpEmailTemplateProps {
  firstName: string;
  verificationCode: string;
}

export const OtpEmailTemplate: React.FC<Readonly<OtpEmailTemplateProps>> = ({
  firstName,
  verificationCode,
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
    <h2 style={{ color: '#333' }}>Aroosi Email Verification</h2>
    <p>Hello {firstName},</p>
    <p>Thank you for signing up with Aroosi. Please use the following verification code to complete your registration:</p>
    <div style={{ backgroundColor: '#f5f5f5', padding: '20px', textAlign: 'center', borderRadius: '5px', margin: '20px 0' }}>
      <h3 style={{ margin: 0, color: '#333', fontSize: '24px', letterSpacing: '5px' }}>{verificationCode}</h3>
    </div>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't request this verification, please ignore this email.</p>
    <p>Best regards,<br />The Aroosi Team</p>
  </div>
);