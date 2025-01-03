const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function reset() {
  try {
    // Check initial state
    console.log('📊 Checking initial database state...');
    try {
      const initialState = await execPromise('npx wrangler d1 execute cms-db --local --command="SELECT name FROM sqlite_master WHERE type=\'table\';"');
      console.log('Initial tables:', initialState.stdout);
    } catch (e) {
      console.log('No initial database found (expected)');
    }

    console.log('🗑️ Deleting database...');
    await execPromise('npx wrangler d1 delete cms-db -y');
    
    console.log('🆕 Creating fresh database...');
    const createResult = await execPromise('npx wrangler d1 create cms-db');
    console.log(createResult.stdout);
    
    console.log('📝 Running initial migration...');
    const migrationPath = './migrations/sql/0000_initial.sql';
    console.log(`Using migration file: ${migrationPath}`);
    
    const migrateResult = await execPromise(`npx wrangler d1 execute cms-db --local --file=${migrationPath}`);
    console.log('Migration output:', migrateResult.stdout);
    
    console.log('🔍 Verifying final state...');
    const finalState = await execPromise('npx wrangler d1 execute cms-db --local --command="SELECT name FROM sqlite_master WHERE type=\'table\';"');
    console.log('Final tables:', finalState.stdout);
    
    // Verify site_config specifically
    const siteConfigCheck = await execPromise('npx wrangler d1 execute cms-db --local --command="SELECT * FROM site_config;"');
    console.log('site_config contents:', siteConfigCheck.stdout);

  } catch (error) {
    console.error('❌ Reset failed:', error);
    console.error('Error details:', error.message);
    if (error.stdout) console.error('stdout:', error.stdout);
    if (error.stderr) console.error('stderr:', error.stderr);
    process.exit(1);
  }
}

reset();