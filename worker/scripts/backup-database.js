// scripts/backup-database.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Create backups directory if it doesn't exist
const backupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Generate timestamp for backup filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `cms-db-prod-backup-${timestamp}.sql`);

console.log('Creating production database backup...');
try {
  // Export the database
  execSync(`wrangler d1 backup cms-db-prod --output=${backupFile}`);
  console.log(`✅ Backup created at: ${backupFile}`);
} catch (error) {
  console.error('❌ Backup failed:', error.message);
  process.exit(1);
}