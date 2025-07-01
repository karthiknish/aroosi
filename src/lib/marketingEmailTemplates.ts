import { Profile } from "@/types/profile";

type MarketingEmailPayload = {
  subject: string;
  html: string;
};

function wrapMarketingEmailContent(
  title: string,
  body: string,
  unsubscribeToken: string,
): string {
  const brandGold = "#BFA67A";
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
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
                  ${body}
                </td>
              </tr>
              <tr>
                <td style="background:#f5f5f5; padding:20px; text-align:center; font-size:12px; color:#666;">
                  You're receiving this email because you opted in to marketing communications from <strong>Aroosi</strong>.<br />
                  <a href="https://aroosi.app/unsubscribe?token=${unsubscribeToken}" style="color:#666; text-decoration:underline;">Unsubscribe</a> | 
                  <a href="https://aroosi.app/email-preferences?token=${unsubscribeToken}" style="color:#666; text-decoration:underline;">Update preferences</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

export function welcomeDay1Template(
  profile: Profile,
  unsubscribeToken: string,
): MarketingEmailPayload {
  const subject = "Welcome to Aroosi! Here's how to find your perfect match 💕";
  const body = `
    <h1 style="margin-top:0;">Welcome to the Aroosi family, ${profile.fullName}!</h1>
    <p style="font-size:16px; line-height:1.6;">We're thrilled to have you join our community of Afghan singles looking for meaningful connections.</p>
    
    <h2 style="color:#BFA67A;">🎯 3 Tips to Get Started:</h2>
    <ol style="font-size:15px; line-height:1.8;">
      <li><strong>Complete Your Profile:</strong> Profiles with photos get 10x more views!</li>
      <li><strong>Be Authentic:</strong> Share your genuine interests and values</li>
      <li><strong>Stay Active:</strong> Regular logins boost your visibility</li>
    </ol>
    
    <p style="font-size:16px; line-height:1.6;">Ready to meet someone special?</p>
    <a href="https://aroosi.app/search" class="btn" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Start Browsing Profiles</a>
  `;
  return {
    subject,
    html: wrapMarketingEmailContent(subject, body, unsubscribeToken),
  };
}

export function profileCompletionReminderTemplate(
  profile: Profile,
  completionPercentage: number,
  unsubscribeToken: string,
): MarketingEmailPayload {
  const subject = `${profile.fullName}, your profile is ${completionPercentage}% complete`;
  const missingItems = [];

  if (!profile.bio) missingItems.push("Add your bio");
  if (!profile.images || profile.images.length === 0)
    missingItems.push("Upload photos");
  if (!profile.interests) missingItems.push("Share your interests");

  const body = `
    <h1 style="margin-top:0;">You're almost there! 🌟</h1>
    <p style="font-size:16px; line-height:1.6;">Hi ${profile.fullName}, complete profiles get <strong>5x more matches</strong>. You're currently at ${completionPercentage}% completion.</p>
    
    <div style="background:#f9f9f9; padding:20px; border-radius:8px; margin:20px 0;">
      <h3 style="margin-top:0;">Quick wins to boost your profile:</h3>
      <ul style="font-size:15px; line-height:1.8; margin:0;">
        ${missingItems.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </div>
    
    <p style="font-size:16px; line-height:1.6;">It only takes 2 minutes to complete!</p>
    <a href="https://aroosi.app/profile/edit" class="btn" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Complete My Profile</a>
  `;
  return {
    subject,
    html: wrapMarketingEmailContent(subject, body, unsubscribeToken),
  };
}

export function weeklyMatchesDigestTemplate(
  profile: Profile,
  matchCount: number,
  unsubscribeToken: string,
): MarketingEmailPayload {
  const subject = `${matchCount} new profiles match your preferences this week`;
  const body = `
    <h1 style="margin-top:0;">Your Weekly Matches Are Ready! 💝</h1>
    <p style="font-size:16px; line-height:1.6;">Hi ${profile.fullName}, we found <strong>${matchCount} new profiles</strong> that match your preferences this week.</p>
    
    <div style="text-align:center; margin:30px 0;">
      <div style="display:inline-block; background:#faf7f2; padding:20px 40px; border-radius:8px;">
        <h2 style="margin:0; color:#BFA67A; font-size:48px;">${matchCount}</h2>
        <p style="margin:5px 0 0 0; font-size:14px; color:#666;">New Matches</p>
      </div>
    </div>
    
    <p style="font-size:16px; line-height:1.6;">Don't miss out on potential connections!</p>
    <a href="https://aroosi.app/search" class="btn" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">View My Matches</a>
  `;
  return {
    subject,
    html: wrapMarketingEmailContent(subject, body, unsubscribeToken),
  };
}

export function reEngagementTemplate(
  profile: Profile,
  daysSinceLastLogin: number,
  unsubscribeToken: string,
): MarketingEmailPayload {
  const subject = "We miss you at Aroosi! Come see what's new 👋";
  const body = `
    <h1 style="margin-top:0;">Hey ${profile.fullName}, we've missed you!</h1>
    <p style="font-size:16px; line-height:1.6;">It's been ${daysSinceLastLogin} days since your last visit. Here's what you've missed:</p>
    
    <ul style="font-size:15px; line-height:1.8;">
      <li>🆕 New members have joined from your area</li>
      <li>💌 Improved messaging features</li>
      <li>🔍 Enhanced search filters</li>
    </ul>
    
    <div style="background:#fff8f0; border-left:4px solid #BFA67A; padding:15px; margin:20px 0;">
      <p style="margin:0; font-size:15px;"><strong>Pro tip:</strong> Update your profile photo to get noticed by new members!</p>
    </div>
    
    <a href="https://aroosi.app/" class="btn" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Return to Aroosi</a>
  `;
  return {
    subject,
    html: wrapMarketingEmailContent(subject, body, unsubscribeToken),
  };
}

export function premiumPromoTemplate(
  profile: Profile,
  discountPercentage: number,
  unsubscribeToken: string,
): MarketingEmailPayload {
  const subject = `${profile.fullName}, unlock ${discountPercentage}% off Premium today only! ⭐`;
  const body = `
    <h1 style="margin-top:0;">Exclusive Offer Just for You! 🎉</h1>
    <p style="font-size:16px; line-height:1.6;">Hi ${profile.fullName}, upgrade to Premium and save <strong>${discountPercentage}%</strong> today only!</p>
    
    <div style="background:#BFA67A; color:white; padding:30px; border-radius:8px; text-align:center; margin:20px 0;">
      <h2 style="margin:0; font-size:36px;">${discountPercentage}% OFF</h2>
      <p style="margin:10px 0 0 0; font-size:18px;">Premium Membership</p>
    </div>
    
    <h3>Premium Benefits Include:</h3>
    <ul style="font-size:15px; line-height:1.8;">
      <li>✅ Unlimited messaging</li>
      <li>✅ See who viewed your profile</li>
      <li>✅ Advanced search filters</li>
      <li>✅ Profile boost for 10x visibility</li>
      <li>✅ Priority customer support</li>
    </ul>
    
    <p style="font-size:14px; color:#666; text-align:center;"><em>Offer expires at midnight tonight!</em></p>
    
    <div style="text-align:center;">
      <a href="https://aroosi.app/pricing" class="btn" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:18px;">Claim My Discount</a>
    </div>
  `;
  return {
    subject,
    html: wrapMarketingEmailContent(subject, body, unsubscribeToken),
  };
}

export function successStoryTemplate(
  storyTitle: string,
  storyPreview: string,
  unsubscribeToken: string,
): MarketingEmailPayload {
  const subject = `Love Story: ${storyTitle} 💑`;
  const body = `
    <h1 style="margin-top:0;">Another Aroosi Success Story! 💕</h1>
    
    <div style="background:#faf7f2; padding:20px; border-radius:8px; margin:20px 0;">
      <h2 style="margin-top:0; color:#BFA67A;">"${storyTitle}"</h2>
      <p style="font-size:16px; line-height:1.6; font-style:italic;">"${storyPreview}"</p>
    </div>
    
    <p style="font-size:16px; line-height:1.6;">Every day, members like you are finding their perfect match on Aroosi. Your story could be next!</p>
    
    <a href="https://aroosi.app/blog" class="btn" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Read Full Story</a>
    
    <hr style="border:none; border-top:1px solid #eee; margin:30px 0;" />
    
    <p style="font-size:14px; text-align:center;">Ready to write your own success story?</p>
    <p style="text-align:center;">
      <a href="https://aroosi.app/search" style="color:#BFA67A; text-decoration:underline;">Browse Profiles</a>
    </p>
  `;
  return {
    subject,
    html: wrapMarketingEmailContent(subject, body, unsubscribeToken),
  };
}

export function profileViewsTemplate(
  profile: Profile,
  viewCount: number,
  unsubscribeToken: string,
): MarketingEmailPayload {
  const subject = `${viewCount} people viewed your profile this week! 👀`;
  const body = `
    <h1 style="margin-top:0;">Your Profile is Getting Noticed! 🌟</h1>
    <p style="font-size:16px; line-height:1.6;">Hi ${profile.fullName}, <strong>${viewCount} people</strong> checked out your profile this week!</p>
    
    <div style="text-align:center; margin:30px 0;">
      <div style="display:inline-block; background:#faf7f2; padding:30px 50px; border-radius:8px;">
        <h2 style="margin:0; color:#BFA67A; font-size:64px;">${viewCount}</h2>
        <p style="margin:5px 0 0 0; font-size:16px; color:#666;">Profile Views</p>
      </div>
    </div>
    
    <div style="background:#fff8f0; border:1px solid #BFA67A; padding:20px; border-radius:8px; margin:20px 0;">
      <h3 style="margin-top:0;">🔓 Want to see who viewed your profile?</h3>
      <p style="margin-bottom:0;">Upgrade to Premium and discover who's interested in you!</p>
    </div>
    
    <a href="https://aroosi.app/pricing" class="btn" style="display:inline-block;background:#BFA67A;color:#ffffff!important;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Upgrade to Premium</a>
  `;
  return {
    subject,
    html: wrapMarketingEmailContent(subject, body, unsubscribeToken),
  };
}

export type MarketingEmailTemplateFn = (
  ...args: any[]
) => MarketingEmailPayload;
