const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function runMigration(sqlFile, environment = 'local') {
  console.log(`Running migration: ${sqlFile}`);
  
  const command = environment === 'local' 
    ? `npx wrangler d1 execute cms-db --local --file=./migrations/sql/${sqlFile}`
    : `npx wrangler d1 execute cms-db --file=./migrations/sql/${sqlFile}`;

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running migration ${sqlFile}:`, error);
        reject(error);
        return;
      }
      console.log(`Migration ${sqlFile} completed successfully`);
      resolve(stdout);
    });
  });
}

async function migrate(environment = 'local') {
  try {
    // Get all SQL files in the migrations directory
    const migrationsDir = path.join(__dirname, 'sql');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();  // Ensure migrations run in order

    // Run each migration
    for (const file of files) {
      await runMigration(file, environment);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
  const environment = process.argv[2] || 'local';
  migrate(environment);
}

module.exports = { migrate };