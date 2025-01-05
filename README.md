# Cloudflare CMS Project

A lightweight, serverless CMS and blog platform built with Cloudflare Pages and Workers.

## Project Goals
- Create a performant, serverless blog platform
- Enable non-technical users to manage content through a simple admin interface
- Keep costs minimal by leveraging Cloudflare's free tier services
- Maintain high performance and security standards

## Tech Stack
- Frontend: Cloudflare Pages
- Backend: Cloudflare Workers
- Database: Cloudflare D1 (SQLite)
- Storage: Cloudflare R2
- Authentication: Custom JWT implementation

## Current Progress

### ✅ Completed
1. Basic Worker Setup
   - Router implementation with error handling
   - CORS middleware
   - Health check endpoint
   - Basic project structure

2. Database Schema
   - Posts table with necessary fields
   - Media table for file storage

3. Basic CRUD API
   - GET /api/posts (with filtering, pagination)
   - POST /api/posts
   - PUT /api/posts/:id
   - DELETE /api/posts/:id

### 🏗️ In Progress
1. Authentication System
   - JWT implementation
   - Login/logout flow
   - Session management

### 📋 Todo
1. File Upload System
   - R2 bucket setup
   - Image upload endpoints
   - Media library management
   - Image optimization

2. Admin Interface
   - Login page
   - Dashboard
   - Post editor with markdown support
   - Media library UI
   - Preview functionality

3. Public Frontend
   - Blog post listing
   - Individual post views
   - Responsive design
   - SEO optimization

4. Testing & Documentation
   - API documentation
   - Unit tests
   - Integration tests
   - Deployment guide

## Project Structure
cloudflare-cms/
├── worker/ # Backend API
│ ├── src/
│ │ ├── index.ts # Main worker entry
│ │ ├── router.ts # Router implementation
│ │ └── middleware/# Middleware functions
├── admin/ # Admin interface (TODO)
├── shared/ # Shared types/utilities
└── public/ # Public assets

### Admin sub-directory structure
cloudflare-cms/admin/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte      # Root layout (applies to all routes)
│   │   ├── +page.svelte        # Root page (homepage)
│   │   └── admin/
│   │       ├── +page.svelte    # Admin dashboard page   / accidentally deleted and needs to be recreated
│   │       └── posts/           # Posts management page / accidentally deleted and needs to be recreated
│   │           └── +page.svelte # Posts management page
│   ├── lib/                     # Shared components and utilities
│   └── app.postcss             # Global styles
├── static/                      # Static assets
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
├── svelte.config.js            # SvelteKit configuration
├── vite.config.ts              # Vite configuration
└── package.json                # Project dependencies


## API Endpoints

### Implemented
typescript
GET /api/health # Health check
GET /api/posts # List posts (with filtering)
POST /api/posts # Create post
PUT /api/posts/:id # Update post
DELETE /api/posts/:id # Delete post

### Planned
typescript
POST /api/auth/login # Login
POST /api/upload # File upload
GET /api/media # List media
DELETE /api/media/:id # Delete media


## Development Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Create D1 database: `npx wrangler d1 create cms-db`
4. Update wrangler.toml with your database ID
5. Run locally: `npx wrangler dev`

## Current Challenges
1. Implementing secure authentication system
2. Setting up efficient file upload workflow
3. Designing user-friendly admin interface
4. Optimizing image delivery

## Next Steps
1. Complete authentication system
2. Implement R2 storage for media files
3. Begin admin interface development
4. Set up continuous deployment

## Contributing
This project is under active development. Please check the issues tab for current tasks or create new ones for bugs/features.

## License
MIT

## References
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)

Notes

# Terminal 1 (in worker directory)
npx wrangler dev

# Terminal 2 (in admin directory)
npm run dev

# Terminal 3 (in blog directory)
npm run dev

## Database Management

### Setup and Migrations
The project uses Cloudflare D1 (SQLite) for the database. All database changes are managed through migrations in the `worker/migrations/sql` directory.

```bash
# Create a new D1 database
npx wrangler d1 create cms-db

# Run all migrations
npm run db:migrate

# Reset database (WARNING: This will delete all data)
npm run db:reset

# Blow up the database (WARNING: This will delete all data)
npx wrangler d1 execute cms-db --local --file=/Users/jt/cloudflare-cms/worker/migrations/sql/0000_initial.sql
```

### Database Structure
The database consists of several core tables:

1. `site_config`
   - Stores site-wide configuration
   - Contains title, description, and navigation settings
   - Default values are set in initial migration

2. `posts`
   - Blog post content and metadata
   - Includes title, content, slug, and publishing status
   - Indexed for efficient querying

3. `media`
   - Tracks uploaded files and their metadata
   - Links to R2 storage through r2_key
   - Includes file information like size and mime type

4. `_migrations`
   - Tracks which migrations have been applied
   - Prevents duplicate migrations

### Debugging Database
```bash
# View current database state
curl http://localhost:8787/api/debug/db

# Check specific table contents
npx wrangler d1 execute cms-db --local --command="SELECT * FROM site_config;"
```

### Creating New Migrations
1. Create a new SQL file in `worker/migrations/sql`
2. Name it with sequential numbering (e.g., `0001_add_new_field.sql`)
3. Include both up and down migrations if possible
4. Run migration with:
```bash
npx wrangler d1 execute cms-db --local --file=./migrations/sql/your_migration.sql
```

Project: Cloudflare CMS
Structure:
- /admin (Svelte frontend)
- /blog (Public frontend)
- /worker (Cloudflare Worker backend)

Key Components:
1. Media Management
   - R2 Storage for files
   - D1 Database for metadata
   - CRUD operations implemented
   - Recently fixed delete functionality using r2_key

2. Authentication
   - JWT-based auth
   - Environment variables:
     - Worker: JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
     - Admin: VITE_API_URL only

3. Database
   - Using Cloudflare D1
   - Media table includes: id, filename, r2_key, mime_type, size, created_at
   - Posts table implemented

Recent Work:
- Fixed media deletion bug by querying DB with r2_key instead of id

Development Environment:
- Local development using Wrangler
- Environment variables in .dev.vars for worker
- Frontend running on localhost:5174
- Worker running on localhost:8787

1 Started with fixing the Posts functionality
Implemented proper CRUD operations
Fixed lastRowId issues with D1 database
Changed to meta.last_row_id and meta.changes

2 Fixed Media Management
Implemented upload functionality
Fixed delete operations
Debugged issues with R2 storage and D1 database
Fixed file deletion UI refresh

3 Environment & Database Structure
Set up proper environment variables
Configured D1 database tables
Implemented R2 storage for media files
Set up proper error handling

4 Authentication
Implemented JWT-based auth
Set up proper environment variables
Rotated secrets after exposure

5 Project Structure
Monorepo with admin/blog/worker
Set up proper .gitignore
Initialized Git repository
Fixed exposed secrets issue






next 
Start your worker (wrangler dev)
Start your admin panel (npm run dev)
Start your blog (npm run dev)
Make a change in the admin panel
Verify the blog updates automatically

is this right?
  router.delete('/api/media/:id', async (request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>) => {
    return deleteMedia(request, env, params.id);
  });


  That clean up script i had to add to the index.ts file to get rid of the duplicate files.
    // Add this temporarily for cleanup
  router.post('/api/debug/cleanup', async (request: Request, env: Env) => {
    try {
      console.log('🧹 Starting cleanup...');
      
      // Get all files from database
      const { results: dbFiles } = await env.DB.prepare(`
        SELECT * FROM media
      `).all();
      
      console.log('📊 Files in database:', dbFiles);
      
      // List all files in R2
      const r2List = await env.MEDIA_BUCKET.list();
      console.log('📦 Files in R2:', r2List.objects);
      
      // Delete the problematic file from both places
      await env.DB.prepare(`
        DELETE FROM media 
        WHERE r2_key LIKE '%c9675786-a03a-4812-8415-fef038877a7c%'
      `).run();
      
      try {
        await env.MEDIA_BUCKET.delete('c9675786-a03a-4812-8415-fef038877a7c-Bouy_4 Transparent.png');
      } catch (e) {
        console.log('R2 delete error (expected if file already gone):', e);
      }
      
      return new Response(JSON.stringify({
        message: 'Cleanup completed',
        dbFiles,
        r2Files: r2List.objects
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Cleanup error:', error);
      return new Response(JSON.stringify({ error: 'Cleanup failed' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });


  reset the database with ``npm run db:reset`` >> warning! this will delete all the data in the database.

## Database Management

### Setup and Migrations
The project uses Cloudflare D1 (SQLite) for the database. All database changes are managed through migrations in the `worker/migrations/sql` directory.

```bash
# Create a new D1 database
npx wrangler d1 create cms-db

# Run all migrations
npm run db:migrate

# Reset database (WARNING: This will delete all data)
npm run db:reset
```

### Database Structure
The database consists of several core tables:

1. `site_config`
   - Stores site-wide configuration
   - Contains title, description, and navigation settings
   - Default values are set in initial migration

2. `posts`
   - Blog post content and metadata
   - Includes title, content, slug, and publishing status
   - Indexed for efficient querying

3. `media`
   - Tracks uploaded files and their metadata
   - Links to R2 storage through r2_key
   - Includes file information like size and mime type

4. `_migrations`
   - Tracks which migrations have been applied
   - Prevents duplicate migrations

### Debugging Database
```bash
# View current database state
curl http://localhost:8787/api/debug/db

# Check specific table contents
npx wrangler d1 execute cms-db --local --command="SELECT * FROM site_config;"
```

### Creating New Migrations
1. Create a new SQL file in `worker/migrations/sql`
2. Name it with sequential numbering (e.g., `0001_add_new_field.sql`)
3. Include both up and down migrations if possible
4. Run migration with:
```bash
npx wrangler d1 execute cms-db --local --file=./migrations/sql/your_migration.sql
npx wrangler d1 execute cms-db --local --file=./migrations/sql/0000_initial.sql
```

### Best Practices
- Never modify existing migrations
- Create new migrations for schema changes
- Include meaningful migration names
- Test migrations locally before deployment
- Back up data before running migrations in production

Questions.
Blog Integration - should I maintain compatibility with existing file-based posts, and if so, how would a user be able to upload a file-based post?

Next Steps
CMS Admin Panel Updates
Add a markdown editor component (like CodeMirror or Monaco)
Add image upload functionality
Add preview functionality
Support for frontmatter (metadata)
Worker API Changes
Expand post schema to include markdown content
Add image upload/storage endpoints
Add image serving endpoints
Update post CRUD operations
Storage Requirements
Image storage solution (R2 or similar)
Content storage updates (D1 schema changes)
Blog Integration
Update post rendering to handle markdown
Update image handling
Maintain compatibility with existing file-based posts

Storage Layer (First)
- Add preview endpoint
a. Update D1 Schema
- Add markdown content field
- Add metadata fields for images
- Update migrations

b. Set up R2 Storage
- Configure R2 bucket
- Set up image upload/delete functions
- Add image URL generation

API Layer (Second)
a. Update Post Endpoints
- Modify POST/PUT to handle markdown
- Add image upload endpoint
- Add image serving endpoint
- Add image deletion endpoint

b. Add Preview Functionality
- Add markdown-to-html conversion
- Add preview endpoint

Preview
Websockets




What next?
I think we can do all the pages that don't get updated regularly in the site_config dashboard of the admin panel. 
This means adding to the database 
   Booolean (1/0) for whether an image tagline is displayed in Pics
   Description of each image that can be used for SEO but not displayed in the Pics page unless the boolean is 1
   Description of pics page (replaces "just some random photos. taken on pixel 8, pixel 5a, pixel 2.")
   Description in about page (replaces "hey there! i'm a student in seattle who goes by the name refact0r online. i'm interested in comp sci, web dev, design, among other topics. i'm passionate about building websites and apps that are both functional and beautiful.")  
   "links" heading for subheading one in about page
   github/>
   discord/>   
   "languages" heading for subheading two in about page
   web -> js / ts / html / css / scss
other -> python / dart / java
   String
   JSON
   tech
frameworks -> sveltekit / flutter / quart
databases -> mongo / sqlite / isar
cms -> sanity / decap
tools -> vscode / figma / inkscape
this site
github repo/>
analytics/>
stack -> sveltekit / mdsvex / vite / vercel
fonts -> space mono / space grotesk
bg
bg-2
bg-3
txt-3
txt-2
txt
txt-0
pink
purple
blue
webring
<- catppuccin webring ->
Contact tagline
public email 
private email 
discord handle 


Creating these database tables and API endpoints
Setting up the store to handle these new data types
3. Creating the admin UI components
Updating the blog frontend
Or would you prefer to see the complete plan first? Let me know which approach you'd prefer and we can proceed step by step.
The advantage of doing all pages together is:
Single database migration
Consistent API pattern
Reusable admin components
Single store update
One-time testing of the full flow
Would you like to proceed with the database/API layer first?


