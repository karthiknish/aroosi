const https = require('https');
const http = require('http');

// Test data
const testData = {
  email: "test@example.com",
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

// Function to make HTTP POST request
function postRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(url, options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        try {
          // Try to parse as JSON first
          const jsonData = JSON.parse(responseBody);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonData
          });
        } catch (error) {
          // If JSON parsing fails, return the raw response
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseBody
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// Test the signup API
async function testSignup() {
  console.log('Testing signup API...');
  console.log('Request data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await postRequest('http://localhost:3000/api/auth/signup', testData);
    console.log('\nResponse:');
    console.log('Status:', response.statusCode);
    console.log('Headers:', response.headers);
    
    if (typeof response.body === 'string') {
      console.log('Body (raw):', response.body.substring(0, 500) + (response.body.length > 500 ? '...' : ''));
    } else {
      console.log('Body (JSON):', JSON.stringify(response.body, null, 2));
    }
  } catch (error) {
    console.error('Error making request:', error.message);
  }
}

// Run the test
testSignup();