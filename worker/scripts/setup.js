const { execSync } = require('child_process');

function runCommand(command) {
    try {
        return { 
            success: true, 
            output: execSync(command, { stdio: 'pipe', encoding: 'utf-8' }) 
        };
    } catch (error) {
        return { 
            success: false, 
            error: error.message 
        };
    }
}

async function setup() {
    console.log('🔍 Checking existing resources...');
    
    // Check D1 database
    const dbList = runCommand('npx wrangler d1 list');
    const dbExists = dbList.success && dbList.output.includes('cms-db');
    
    // Check R2 buckets
    const bucketList = runCommand('npx wrangler r2 bucket list');
    const mediaBucketExists = bucketList.success && bucketList.output.includes('cms-media');
    const postImagesBucketExists = bucketList.success && bucketList.output.includes('post-images');

    // Handle D1 Database
    if (dbExists) {
        console.log('📦 Database exists, running migration...');
        runCommand('npx wrangler d1 execute cms-db --local --file=./migrations/sql/0000_initial.sql');
    } else {
        console.log('🏗️ Creating new database...');
        const createResult = runCommand('npx wrangler d1 create cms-db');
        if (createResult.success) {
            console.log('Running initial migration...');
            runCommand('npx wrangler d1 execute cms-db --local --file=./migrations/sql/0000_initial.sql');
        } else {
            console.error('Failed to create database');
            process.exit(1);
        }
    }

    // Handle R2 Buckets
    if (!mediaBucketExists) {
        console.log('🏗️ Creating media bucket...');
        runCommand('npx wrangler r2 bucket create cms-media');
    }

    if (!postImagesBucketExists) {
        console.log('🏗️ Creating post-images bucket...');
        runCommand('npx wrangler r2 bucket create post-images');
    }

    console.log('✅ Setup complete!');
}

setup().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
}); 