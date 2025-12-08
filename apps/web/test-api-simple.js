// Simple test to check if we can make a POST request to the signup endpoint
const https = require('https');
const http = require('http');

// Test data
const testData = {
  email: "testuser@example.com",
  password: "Password123!",
  fullName: "Test User",
  profile: {
    fullName: "Test User",
    dateOfBirth: "1990-01-01",
    gender: "male",
    city: "Test City",
    aboutMe: "This is a test user for development purposes",
    occupation: "Software Developer",
    education: "Bachelor's Degree",
    height: "180 cm",
    maritalStatus: "single",
    phoneNumber: "+1234567890",
    country: "USA",
    isProfileComplete: true
  }
};

function testSignup() {
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/signup',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        if (rawData.startsWith('{') || rawData.startsWith('[')) {
          const parsedData = JSON.parse(rawData);
          console.log('RESPONSE BODY (parsed):', JSON.stringify(parsedData, null, 2));
        } else {
          console.log('RESPONSE BODY (raw):', rawData.substring(0, 200) + '...');
        }
      } catch (e) {
        console.error('Error parsing response:', e.message);
        console.log('RESPONSE BODY (raw):', rawData.substring(0, 200) + '...');
      }
    });
  });
  
  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });
  
  // Write data to request body
  req.write(postData);
  req.end();
}

testSignup();