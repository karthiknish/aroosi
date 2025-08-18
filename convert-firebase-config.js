const fs = require('fs');

// Read the Firebase service account JSON file
const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));

// Convert to single-line JSON string
const singleLineJson = JSON.stringify(serviceAccount);

// Output the result
console.log('FIREBASE_SERVICE_ACCOUNT=' + singleLineJson);