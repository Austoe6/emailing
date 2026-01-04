// Simple test script to test the broadcast API
const http = require('http');

const testData = JSON.stringify({
  subject: 'Test Broadcast Email',
  body: '<h1>Hello from Resend Broadcast API!</h1><p>This is a test email sent to all contacts.</p>',
  fromEmail: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
  fromName: 'Test Sender'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/broadcast',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('🚀 Testing Resend Broadcast API...\n');
console.log('Request:', {
  url: `http://${options.hostname}:${options.port}${options.path}`,
  method: options.method,
  body: JSON.parse(testData)
});
console.log('\n');

const req = http.request(options, (res) => {
  let data = '';

  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  console.log('\nResponse:\n');

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Make sure the server is running: npm start');
});

req.write(testData);
req.end();

