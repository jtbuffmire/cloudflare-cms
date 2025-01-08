import fs from 'fs';
import path from 'path';

async function uploadDefaultAnimations() {
    const animationsDir = path.join(__dirname, '../animations');
    const files = fs.readdirSync(animationsDir);

    for (const file of files) {
        if (path.extname(file) === '.json') {
            const name = path.basename(file, '.json');
            const content = fs.readFileSync(path.join(animationsDir, file));
            
            const formData = new FormData();
            formData.append('file', new Blob([content], { type: 'application/json' }), file);
            formData.append('name', name);

            try {
                const response = await fetch('http://localhost:8787/api/animations', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Failed to upload ${file}`);
                }

                console.log(`✅ Uploaded ${file}`);
            } catch (error) {
                console.error(`❌ Failed to upload ${file}:`, error);
            }
        }
    }
}

uploadDefaultAnimations().catch(console.error);