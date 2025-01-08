const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.dev.vars' });

// Log the secret being used (be careful with this in production!)
console.log('Using JWT_SECRET:', process.env.JWT_SECRET);

const token = jwt.sign(
  { username: process.env.ADMIN_USERNAME },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

console.log('Test token:', token);

// Verify the token to make sure it works
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token verified successfully:', decoded);
} catch (error) {
  console.error('Token verification failed:', error);
} 