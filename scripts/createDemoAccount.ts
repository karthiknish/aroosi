#!/usr/bin/env ts-node
/**
 * Create a comprehensive demo account for App Store review
 *
 * This script creates a demo user with:
 * - Complete profile with all fields
 * - Profile images
 * - Cultural profile data
 * - Family approval requests and responses
 * - Supervised conversations
 * - Matches and interactions
 * - Cultural compatibility data
 *
 * Usage:
 *   npx ts-node scripts/createDemoAccount.ts --email demo@aroosi.app --password demo123456
 */

import path from 'path';
import fs from 'fs';
import { faker } from '@faker-js/faker';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let adminDb: FirebaseFirestore.Firestore;
let adminAuth: ReturnType<typeof getAuth>;
let adminStorage: ReturnType<typeof getStorage>;

function initAdmin() {
  if (adminDb) return;

  // Load Firebase service account
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  let svc: any = null;
  const tryParse = (s?: string|null) => {
    if (!s) return null;
    const t = s.trim();
    if (!t) return null;
    try { return JSON.parse(t); } catch { return null; }
  };

  if (raw) svc = tryParse(raw) || null;
  if (!svc && b64) {
    try { const dec = Buffer.from(b64, 'base64').toString('utf8'); svc = JSON.parse(dec); } catch {}
  }

  if (!svc) {
    console.error('Missing Firebase service account credentials. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_BASE64');
    process.exit(1);
  }

  if (!getApps().length) {
    const projectId = svc.project_id || 'aroosi-project';
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

    initializeApp({
      credential: cert(svc),
      projectId,
      storageBucket
    });
  }

  adminDb = getFirestore();
  adminAuth = getAuth();
  adminStorage = getStorage();
}

interface DemoAccountOptions {
  email: string;
  password: string;
  fullName: string;
  gender: 'male' | 'female';
}

function parseArgs(): DemoAccountOptions {
  const args = process.argv.slice(2);
  let email = 'demo@aroosi.app';
  let password = 'demo123456';
  let fullName = 'Aroosi Demo User';
  let gender: 'male' | 'female' = 'male';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--email':
        email = args[++i] || email;
        break;
      case '--password':
        password = args[++i] || password;
        break;
      case '--name':
        fullName = args[++i] || fullName;
        break;
      case '--gender':
        gender = (args[++i] === 'female' ? 'female' : 'male') as 'male' | 'female';
        break;
    }
  }

  return { email, password, fullName, gender };
}

async function uploadDemoImage(localPath: string, dest: string): Promise<string | null> {
  try {
    if (!fs.existsSync(localPath)) {
      console.log(`Image not found: ${localPath}`);
      return null;
    }

    const bucket = adminStorage.bucket();
    await bucket.upload(localPath, {
      destination: dest,
      metadata: { cacheControl: 'public,max-age=31536000' }
    });

    const [url] = await bucket.file(dest).getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 // 1 year
    });

    console.log(`Uploaded image: ${dest}`);
    return url;
  } catch (e) {
    console.warn('Image upload failed', localPath, (e as Error).message);
    return null;
  }
}

async function createDemoAccount(options: DemoAccountOptions) {
  const { email, password, fullName, gender } = options;

  console.log(`Creating demo account: ${email}`);

  // Create Firebase Auth user
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
      emailVerified: true,
    });

    console.log(`Created Firebase Auth user: ${userRecord.uid}`);

    // Create comprehensive profile
    const now = Date.now();
    const dateOfBirth = new Date(now - (25 * 365 * 24 * 60 * 60 * 1000)); // 25 years ago

    // Upload profile images
    const imageUrls: string[] = [];
    const seedImageDir = path.join(process.cwd(), 'seed_images', gender === 'male' ? 'male' : 'female');

    if (fs.existsSync(seedImageDir)) {
      const imageFiles = fs.readdirSync(seedImageDir).filter(f => !f.startsWith('.') && f.endsWith('.jpg'));
      if (imageFiles.length > 0) {
        // Upload up to 5 images
        for (let i = 0; i < Math.min(5, imageFiles.length); i++) {
          const localPath = path.join(seedImageDir, imageFiles[i]);
          const dest = `profileImages/${userRecord.uid}/${imageFiles[i]}`;
          const url = await uploadDemoImage(localPath, dest);
          if (url) imageUrls.push(url);
        }
      }
    }

    // Create main profile
    const profileData = {
      _id: userRecord.uid,
      userId: userRecord.uid,
      email,
      fullName,
      dateOfBirth: dateOfBirth.toISOString().split('T')[0],
      gender,
      city: 'London',
      country: 'UK',
      phoneNumber: '+44 7700 900000',
      aboutMe: 'I\'m a devoted Muslim seeking a life partner who shares my values and faith. I believe in building a strong family foundation based on love, respect, and Islamic principles. I enjoy reading, traveling, and spending time with family. Looking for someone who is kind-hearted, ambitious, and committed to their faith.',
      height: '175cm',
      maritalStatus: 'single' as const,
      education: 'Masters in Computer Science',
      occupation: 'Software Engineer',
      annualIncome: '£75000',
      diet: 'halal' as const,
      smoking: 'no' as const,
      drinking: 'no' as const,
      physicalStatus: 'normal' as const,
      partnerPreferenceAgeMin: 23,
      partnerPreferenceAgeMax: 35,
      partnerPreferenceCity: ['London', 'Manchester', 'Birmingham'],
      partnerPreferenceReligion: ['Islam'],
      preferredGender: 'female' as const,
      profileImageIds: [],
      profileImageUrls: imageUrls,
      profileCompletionPercentage: 100,
      isApproved: true,
      banned: false,
      createdAt: now,
      updatedAt: now,
      _creationTime: now,
      subscriptionPlan: 'premium' as const,
      subscriptionExpiresAt: now + (365 * 24 * 60 * 60 * 1000), // 1 year
      boostsRemaining: 5,
      boostsMonth: 5,
      hasSpotlightBadge: true,
      spotlightBadgeExpiresAt: now + (30 * 24 * 60 * 60 * 1000), // 30 days
      motherTongue: 'Urdu',
      religion: 'Islam',
      ethnicity: 'Pakistani',
      interests: ['Reading', 'Travel', 'Cooking', 'Islamic Studies', 'Technology', 'Fitness'],
      hideFromFreeUsers: false,
    };

    await adminDb.collection('profiles').doc(userRecord.uid).set(profileData);
    console.log('Created comprehensive profile');

    // Create cultural profile
    const culturalProfileData = {
      userId: userRecord.uid,
      religion: 'Islam',
      religiousPractice: 'practicing',
      motherTongue: 'Urdu',
      languages: ['Urdu', 'English', 'Arabic'],
      familyValues: 'traditional',
      marriageViews: 'arranged_love',
      traditionalValues: 'very_important',
      importanceOfReligion: 10,
      importanceOfCulture: 9,
      familyBackground: 'I come from a close-knit family that values education, faith, and community. My parents have been married for 30 years and serve as role models for a loving, respectful relationship. Family gatherings, prayers, and supporting each other through life\'s challenges are important to us.',
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.collection('culturalProfiles').doc(userRecord.uid).set(culturalProfileData);
    console.log('Created cultural profile');

    // Create some demo family approval requests
    const familyRequests = [
      {
        requesterId: userRecord.uid,
        familyMemberId: faker.string.uuid(),
        relationship: 'father',
        message: 'Dear Father, I have found someone special and would like your blessing to pursue this relationship. She comes from a good family and shares our values.',
        status: 'approved',
        responseMessage: 'My son, I\'m happy you\'ve found someone who shares our faith and values. May Allah bless your union. Please bring her to meet us soon.',
        responseTimestamp: now - (2 * 24 * 60 * 60 * 1000), // 2 days ago
        expiresAt: now + (28 * 24 * 60 * 60 * 1000), // 28 days from now
        createdAt: now - (5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: now - (2 * 24 * 60 * 60 * 1000),
      },
      {
        requesterId: userRecord.uid,
        familyMemberId: faker.string.uuid(),
        relationship: 'mother',
        message: 'Dear Mother, I\'ve been getting to know someone through the app and I really like her. She\'s kind, educated, and shares our faith. I\'d love your thoughts.',
        status: 'approved',
        responseMessage: 'Beta, she sounds like a wonderful girl. I\'m so happy for you. Make sure to treat her with respect and kindness. We should invite her family for dinner.',
        responseTimestamp: now - (1 * 24 * 60 * 60 * 1000), // 1 day ago
        expiresAt: now + (29 * 24 * 60 * 60 * 1000),
        createdAt: now - (3 * 24 * 60 * 60 * 1000), // 3 days ago
        updatedAt: now - (1 * 24 * 60 * 60 * 1000),
      },
      {
        requesterId: userRecord.uid,
        familyMemberId: faker.string.uuid(),
        relationship: 'brother',
        message: 'Brother, I wanted to share that I\'ve started talking to someone special on Aroosi. She seems really nice and we have a lot in common.',
        status: 'pending',
        expiresAt: now + (25 * 24 * 60 * 60 * 1000),
        createdAt: now - (1 * 24 * 60 * 60 * 1000), // 1 day ago
        updatedAt: now - (1 * 24 * 60 * 60 * 1000),
      }
    ];

    for (const request of familyRequests) {
      await adminDb.collection('familyApprovalRequests').add(request);
    }
    console.log('Created family approval requests');

    // Create some supervised conversations
    const supervisedConversations = [
      {
        requesterId: userRecord.uid,
        targetUserId: faker.string.uuid(),
        supervisorId: faker.string.uuid(), // Father's ID
        status: 'approved',
        conversationId: faker.string.uuid(),
        guidelines: [
          'Remember to be respectful and kind',
          'Discuss your values and expectations',
          'Keep conversations appropriate and focused on getting to know each other',
          'Share your family background respectfully'
        ],
        startedAt: now - (7 * 24 * 60 * 60 * 1000), // 1 week ago
        createdAt: now - (10 * 24 * 60 * 60 * 1000), // 10 days ago
        updatedAt: now - (7 * 24 * 60 * 60 * 1000),
      },
      {
        requesterId: userRecord.uid,
        targetUserId: faker.string.uuid(),
        supervisorId: faker.string.uuid(), // Mother's ID
        status: 'active',
        conversationId: faker.string.uuid(),
        guidelines: [
          'Take your time to get to know each other',
          'Be honest about your intentions and expectations',
          'Respect cultural boundaries and traditions',
          'Communicate openly about faith and family values'
        ],
        startedAt: now - (2 * 24 * 60 * 60 * 1000), // 2 days ago
        createdAt: now - (5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: now - (2 * 24 * 60 * 60 * 1000),
      }
    ];

    for (const conversation of supervisedConversations) {
      await adminDb.collection('supervisedConversations').add(conversation);
    }
    console.log('Created supervised conversations');

    // Create some demo matches
    const matches = [];
    for (let i = 0; i < 5; i++) {
      const matchData = {
        fromUserId: userRecord.uid,
        toUserId: faker.string.uuid(),
        status: faker.helpers.arrayElement(['pending', 'accepted', 'rejected']),
        createdAt: now - (faker.number.int({ min: 1, max: 30 }) * 24 * 60 * 60 * 1000),
      };
      matches.push(matchData);

      // Also create the reverse match
      const reverseMatch = {
        fromUserId: matchData.toUserId,
        toUserId: userRecord.uid,
        status: faker.helpers.arrayElement(['pending', 'accepted', 'rejected']),
        createdAt: matchData.createdAt - (faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000),
      };
      matches.push(reverseMatch);
    }

    for (const match of matches) {
      await adminDb.collection('interests').add(match);
    }
    console.log('Created demo matches');

    // Create some messages for active conversations
    const activeConversationIds = supervisedConversations
      .filter(c => c.status === 'active' || c.status === 'approved')
      .map(c => c.conversationId);

    for (const conversationId of activeConversationIds) {
      if (conversationId) {
        const messages = [];
        for (let i = 0; i < faker.number.int({ min: 5, max: 15 }); i++) {
          const message = {
            conversationId,
            senderId: faker.helpers.arrayElement([userRecord.uid, faker.string.uuid()]),
            content: faker.lorem.sentences({ min: 1, max: 3 }),
            timestamp: now - (faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000),
            read: faker.datatype.boolean(),
          };
          messages.push(message);
        }

        for (const message of messages) {
          await adminDb.collection('messages').add(message);
        }
      }
    }
    console.log('Created demo messages');

    console.log('\n🎉 Demo account created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔒 Password: ${password}`);
    console.log(`👤 Name: ${fullName}`);
    console.log(`🚀 User ID: ${userRecord.uid}`);
    console.log('\nThis account has access to all premium features including:');
    console.log('✅ Complete profile with all fields filled');
    console.log('✅ Multiple profile images uploaded');
    console.log('✅ Cultural and religious profile data');
    console.log('✅ Family approval requests and responses');
    console.log('✅ Supervised conversations with guidelines');
    console.log('✅ Matches and messaging history');
    console.log('✅ Premium subscription active');
    console.log('✅ Spotlight badge active');
    console.log('✅ Boost credits available');

  } catch (error) {
    console.error('Error creating demo account:', error);
    throw error;
  }
}

async function main() {
  const options = parseArgs();
  initAdmin();

  console.log('Creating comprehensive demo account for App Store review...');
  await createDemoAccount(options);
}

main().catch(e => {
  console.error('Failed to create demo account:', e);
  process.exit(1);
});
