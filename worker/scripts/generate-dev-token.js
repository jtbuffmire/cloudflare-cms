import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.dev.vars') });

const payload = {
  sub: 'admin',
  email: process.env.ADMIN_USERNAME,
  domain: 'localhost',
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

const token = jwt.sign(payload, process.env.JWT_SECRET);

console.log('Development JWT token:', token);

// Verify the token
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token verified successfully:', decoded);
} catch (error) {
  console.error('Token verification failed:', error);
} 