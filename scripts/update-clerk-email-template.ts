/**
 * Script: update-clerk-email-template.ts
 * Purpose: Push custom OTP verification email template to Clerk via Backend API.
 *
 * Requirements:
 *  - CLERK_SECRET_KEY in env
 *  - (Optional) CLERK_TEMPLATE_ID if updating existing custom template
 *
 * NOTE: Clerk currently exposes a beta Email Templates API. Adjust endpoint or payload
 * according to the latest Clerk docs. This script is idempotent: it will create or update
 * a template with a stable slug "custom_verification_code".
 */
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import fetch from 'node-fetch';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  console.error('Missing CLERK_SECRET_KEY');
  process.exit(1);
}

// Template metadata
const SLUG = 'custom_verification_code';
const NAME = 'Aroosi Email Verification Code';

// Load template bodies
const htmlPath = path.resolve(process.cwd(), 'emails/otpVerification.html');
const textPath = path.resolve(process.cwd(), 'emails/otpVerification.txt');

if (!fs.existsSync(htmlPath) || !fs.existsSync(textPath)) {
  console.error('Template files missing. Ensure emails/otpVerification.{html,txt} exist.');
  process.exit(1);
}

const htmlBody = fs.readFileSync(htmlPath, 'utf8')
  .replace(/{{year}}/g, new Date().getFullYear().toString());
const textBody = fs.readFileSync(textPath, 'utf8')
  .replace(/{{year}}/g, new Date().getFullYear().toString());

interface ClerkTemplateResult { id: string; slug: string; name: string; }

async function findExisting(): Promise<ClerkTemplateResult | null> {
  try {
    const res = await fetch('https://api.clerk.com/v1/email_templates', {
      headers: { 'Authorization': `Bearer ${CLERK_SECRET_KEY}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.find(t => t.slug === SLUG) || null;
    }
    return null;
  } catch {
    return null;
  }
}

async function upsert() {
  const existing = await findExisting();
  const payload = {
    name: NAME,
    slug: SLUG,
    subject: 'Your Aroosi verification code',
    from_email_name: 'Aroosi',
    body: htmlBody,
    text_body: textBody,
    // variables expected at runtime: code, user.full_name, year
  };
  let method: 'POST' | 'PUT' = 'POST';
  let url = 'https://api.clerk.com/v1/email_templates';
  if (existing) {
    method = 'PUT';
    url = `https://api.clerk.com/v1/email_templates/${existing.id}`;
  }
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Failed to upsert template', res.status, text);
    process.exit(1);
  }
  const json: any = await res.json();
  console.log(`${existing ? 'Updated' : 'Created'} template`, json.id, json.slug);
}

upsert().catch(e => {
  console.error(e);
  process.exit(1);
});
