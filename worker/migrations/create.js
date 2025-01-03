const fs = require('fs');
const path = require('path');

function createMigration(name) {
  // Get current timestamp
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  
  // Create filename
  const filename = `${timestamp}_${name}.sql`;
  
  // Create migration content
  const content = `-- Migration: ${timestamp}_${name}
-- Created at: ${new Date().toISOString().split('T')[0]}
-- Description: Add description here

-- Add your SQL here

-- Record this migration
INSERT INTO _migrations (name) VALUES ('${timestamp}_${name}');
`;

  // Write file
  const filepath = path.join(__dirname, 'sql', filename);
  fs.writeFileSync(filepath, content);
  
  console.log(`Created new migration: ${filename}`);
}

// Get migration name from command line
const name = process.argv[2];
if (!name) {
  console.error('Please provide a migration name');
  process.exit(1);
}

createMigration(name);