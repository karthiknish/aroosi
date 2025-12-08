const http = require('http');

// Function to make HTTP GET request to check if route exists
function getRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET'
    };
    
    const req = http.request(url, options, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Test if the signup API route exists
async function testRoute() {
  console.log('Testing if signup API route exists...');
  
  try {
    const response = await getRequest('http://localhost:3000/api/auth/signup');
    console.log('Status:', response.statusCode);
    console.log('Headers:', response.headers);
  } catch (error) {
    console.error('Error making request:', error.message);
  }
}

// Run the test
testRoute();