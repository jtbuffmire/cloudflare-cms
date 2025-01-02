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

## results in 
```
npx wrangler dev

 ⛅️ wrangler 3.99.0
-------------------

Your worker has access to the following bindings:
- D1 Databases:
  - DB: cms-db (1777beb6-b1d9-4872-bf79-16aa090a9ecc) (local)
- R2 Buckets:
  - MEDIA_BUCKET: cms-media (local)
- Vars:
  - ENVIRONMENT: "development"
  - JWT_SECRET: "d2a0c6a77dfc871cb6f5f584a456564cf07c7..."
  - ADMIN_USERNAME: "admin"
  - ADMIN_PASSWORD: "password"
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

# Terminal 2 (in admin directory)
npm run dev

## results in 
```
> admin@0.0.1 dev
> vite dev --port 5174


  VITE v5.4.11  ready in 321 ms

  ➜  Local:   http://localhost:5174/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

# Terminal 3 (in blog directory)
npm run dev

## results in 
```
> blog@0.0.1 dev
> vite dev --port 5175

▲ [WARNING] Processing wrangler.toml configuration:

    - Because you've defined a [site] configuration, we're defaulting to "workers-site" for the
  deprecated `site.entry-point`field.
      Add the top level `main` field to your configuration file:
      ```
      main = "workers-site/index.js"
      ```


Re-optimizing dependencies because lockfile has changed

  VITE v5.4.11  ready in 687 ms

  ➜  Local:   http://localhost:5175/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

12:38:12 AM [vite-plugin-svelte] /Users/jt/cloudflare-cms/blog/src/routes/+page.svelte:69:0 Unused CSS selector ".pfp"
Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

12:38:12 AM [vite-plugin-svelte] /Users/jt/cloudflare-cms/blog/src/routes/+page.svelte:69:0 Unused CSS selector ".pfp"
12:41:48 AM [vite] page reload src/app.html
12:41:48 AM [vite] page reload .svelte-kit/generated/server/internal.js
Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api

Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.

More info: https://sass-lang.com/d/legacy-js-api
```


mv /Users/jt/personal/worker/src/middleware/cors.ts cors.ts

mv /Users/jt/cloudflare-cms/worker/errorHandler.ts errorHandler.ts

mv /Users/jt/cloudflare-cms/worker/router.ts router.ts 

curl -X POST http://localhost:8787/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTczNTQ5ODUzMywiaWF0IjoxNzM1NDEyMTMzfQ.22n_QUqR6qXcAmefAwinGakqj42HTxmJ5sIxnHTt-co" \
  -d '{"title":"Protected Post","content":"This is protected","slug":"protected-post"}'


Next...
Continue with the dashboard component?
Set up the post editor component?

Start building the admin UI?
Add image optimization features to the media system?

curl -X POST http://localhost:8787/api/media \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTczNTQ5ODUzMywiaWF0IjoxNzM1NDEyMTMzfQ.22n_QUqR6qXcAmefAwinGakqj42HTxmJ5sIxnHTt-co" \
  -F "file=@/Users/jt/Desktop/Bouy_4 Transparent.png"

  '/Users/jt/Desktop/Bouy_4 Transparent.png'

  API

  Next...
  Blog: http://localhost:5175
Admin: http://localhost:5174
API Health Check: http://localhost:8787/api/health
API Posts: http://localhost:8787/api/posts
Check the Network tab in your browser's developer tools for:
Successful API calls
No CORS errors
Proper data loading
If you encounter any issues, let me know:
Which URLs are working/not working
Any console errors
Any network errors
What you see on each page
Would you like to try these steps?

# First get a token
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Then create a post (replace YOUR_TOKEN with the token you received)
curl -X POST http://localhost:8787/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTczNTUyMTAyMiwiaWF0IjoxNzM1NDM0NjIyfQ.iDpwQgHzmkVIA6X0g82O3t8AR6Y3Z_Q8hAcIXk2YAEo" \
  -d '{
    "title": "Test Post",
    "content": "This is a test post",
    "slug": "test-post",
    "published": true
  }'

  npm install plausible-tracker

  Blog hosted at http://localhost:5175/
  Admin hosted at http://localhost:5174/
  API hosted at http://localhost:8787/


npx wrangler dev

 ⛅️ wrangler 3.99.0
-------------------

Your worker has access to the following bindings:
- D1 Databases:
  - DB: cms-db (1777beb6-b1d9-4872-bf79-16aa090a9ecc) (local)
- R2 Buckets:
  - MEDIA_BUCKET: cms-media (local)
- Vars:
  - ENVIRONMENT: "development"
  - JWT_SECRET: "d2a0c6a77dfc871cb6f5f584a456564cf07c7..."
  - ADMIN_USERNAME: "admin"
  - ADMIN_PASSWORD: "password"
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787

graph TD
    A[Blog Frontend - Cloudflare Pages] --> C[API Worker]
    B[Admin UI - Cloudflare Pages] --> C
    C[Cloudflare Worker] --> D[D1 Database]
    C --> E[R2 Storage]

What's next 
Handle file deletion?
Add image optimization?
Set up proper CORS headers?
Add file type validation?
Add icon selection for posts next?
Add slug uniqueness validation?
Add a preview of how the URL will look?

after upgrading let's check svelte.config.js and vite.config.ts for breaking changes.


cd /Users/jt/cloudflare-cms/admin/src/routes/admin/posts/[id]
cursor /Users/jt/cloudflare-cms/admin/src/routes/admin/posts/[id]/+page.svelte

