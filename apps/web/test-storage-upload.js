require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Decode the base64 service account key
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!serviceAccountBase64) {
  console.error('FIREBASE_SERVICE_ACCOUNT_BASE64 not found in environment');
  process.exit(1);
}

const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
const serviceAccount = JSON.parse(serviceAccountJson);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'aroosi-project.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function testStorageUpload() {
  try {
    console.log('Testing Firebase Storage upload via service account...');

    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    const testUserId = 'test-user-123';
    const fileName = `profile-images/test-image-${Date.now()}.png`;
    const filePath = `users/${testUserId}/${fileName}`;

    console.log(`Uploading to: ${filePath}`);

    const file = bucket.file(filePath);
    await file.save(testImageBuffer, {
      metadata: {
        contentType: 'image/png',
      },
    });

    console.log('✅ Upload successful!');

    // Try to read it back
    const [exists] = await file.exists();
    if (exists) {
      console.log('✅ File exists in storage');
    } else {
      console.log('❌ File does not exist in storage');
    }

    // Clean up
    await file.delete();
    console.log('✅ Test file cleaned up');

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    // Clean up Firebase app
    admin.app().delete();
  }
}

testStorageUpload();