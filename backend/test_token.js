const jwt = require('jsonwebtoken');

// Test token structure
const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTczMzI5NzIwMSwiZXhwIjoxNzMzMzgzNjAxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8";

try {
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'your-secret-key');
  console.log('Decoded token structure:');
  console.log(decoded);
  console.log('Available fields:', Object.keys(decoded));
} catch (error) {
  console.error('Error decoding token:', error.message);
} 