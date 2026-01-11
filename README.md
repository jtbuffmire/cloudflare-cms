# Cloudflare CMS Project

A lightweight, serverless CMS and blog platform built with Cloudflare Pages and Workers.

## Project Goals
- Lightweight, serverless blog platform
- Admin page allows non-technical users to manage content through a simple admin interface
- Serverless architecture across all three services keeps costs minimal and leverages Cloudflare's free tiers

## Tech Stack
- Frontend: Cloudflare Pages
- Backend: Cloudflare Workers
- Database: Cloudflare D1 (SQLite)
- Storage: Cloudflare R2
- Authentication: Custom JWT implementation

## Project Structure
This is a monorepo containing three independent but interconnected services:

### 1. Worker (`/worker`)
Backend API handling data storage, authentication, and business logic.
- Main file: `src/index.ts`
- Database interactions through Cloudflare D1
- Media storage via Cloudflare R2
- JWT authentication

### 2. Admin Panel (`/admin`) 
Content management interface for administrators.
- Built with SvelteKit
- Tailwind CSS for styling
- Rich text editor for content creation
- Media management

### 3. Blog (`/blog`)
Public-facing frontend for content consumption.
- Built with SvelteKit
- Responsive design
- SEO optimized
- Fast page loads

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Cloudflare account with Workers, D1, and R2 access

### Environment Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/cloudflare-cms.git
   cd cloudflare-cms
   ```

2. Install dependencies for all services:
   ```bash
   # Worker dependencies
   cd worker && npm install
   
   # Admin panel dependencies
   cd ../admin && npm install
   
   # Blog dependencies
   cd ../blog && npm install
   
   # Return to root
   cd ..
   ```

3. Set up your database:
   ```bash
   # Create development database
   cd worker
   npx wrangler d1 create cms-db-dev
   
   # Initialize schema
   npm run db:reset:dev
   ```

### Running the Project
You'll need three terminal sessions, one for each service:

```bash
# Terminal 1 (worker - backend API)
cd worker
npm run dev  # Runs on localhost:8787

# Terminal 2 (admin - content management)
cd admin
npm run dev  # Runs on localhost:5173

# Terminal 3 (blog - public frontend)
cd blog
npm run dev  # Runs on localhost:4173
```

## Database Management

We use a standardized naming convention for databases:
- `cms-db-dev`: Local development database
- `cms-db-test`: Testing environment database
- `cms-db-prod`: Production database

### Database Operations

```bash
# Reset development database (WARNING: Deletes all data)
cd worker
npm run db:reset:dev

# Create a backup of production database
npm run db:backup

# Run migrations
npm run db:migrate
```

## Deployment

### Production Deployment
```bash
# Deploy the Worker
cd worker
npm run deploy

# Deploy the Admin Panel
cd ../admin
npm run deploy

# Deploy the Blog
cd ../blog
npm run deploy
```

### Environment Management
Update the appropriate environment variables in your Cloudflare dashboard or using Wrangler:

```bash
# Set production secrets
cd worker
wrangler secret put JWT_SECRET --env production
wrangler secret put ADMIN_EMAIL --env production
wrangler secret put ADMIN_PASSWORD --env production
```

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Verify your database ID in wrangler.toml
   - Check that migrations have been run
   - Try resetting the database: `npm run db:reset:dev`

2. **Authentication failures**
   - Verify JWT_SECRET is set correctly
   - Check admin credentials
   - Tokens expire after 24 hours by default

3. **Media upload issues**
   - Verify R2 bucket configuration
   - Check storage permissions

## Contributing
Please see CONTRIBUTING.md for development guidelines and code standards.

## License
MIT

## Current Progress

### ✅ Completed
1. Basic Worker Setup
   - Router implementation with error handling
   - CORS middleware
   - Health check endpoint
   - Basic project structure

2. Database Schema
   - Posts table with necessary fields
   - pics table for file storage

3. Basic CRUD API
   - GET /posts (with filtering, pagination)
   - POST /posts
   - PUT /posts/:id
   - DELETE /posts/:id

4. Basic Authentication System leveraging Cloudflare Secrets
   - JWTs
   - Login/logout flow
   - Session management

5. File Upload System
   - R2 bucket setup
   - Image upload endpoints
   - Media library management
   - Image optimization

6. Admin Interface
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

### Overall structure
cloudflare-cms/
├── README.md              # Main project overview
├── docs/                  # Detailed documentation directory
│   ├── api.md            # API specifications
│   ├── websocket.md      # WebSocket protocol documentation
│   └── data-models.md    # Data structures and schemas
├── worker/               
│   └── README.md         # Worker-specific setup and development
├── admin/               
│   └── README.md         # Admin panel setup and development
└── blog/                 
    └── README.md         # Blog frontend setup and development
    
### 1 Worker sub-directory:
cloudflare-cms/
├── worker/ # Backend API
│ ├── src/
│ │ ├── index.ts # Main worker entry
│ │ ├── router.ts # Router implementation
│ │ └── middleware/# Middleware functions
├── admin/ # Admin interface (TODO)
├── shared/ # Shared types/utilities
└── public/ # Public assets

### 2 Admin sub-directory:
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

### 3 Blog sub-directory:
cloudflare-cms/blog/
├── LICENSE
├── README.md
├── api.ts
├── bun.lockb
├── lib
│   └── assets
├── package-lock.json
├── package.json
├── playwright.config.js
├── src
│   ├── app.d.ts
│   ├── app.html
│   ├── app.scss
│   ├── content
│   ├── hooks.server.js
│   ├── index.test.js
│   ├── lib
│   ├── routes
│   └── variables.scss
├── static
│   ├── favicon.png
│   └── favicon.svg
├── svelte.config.js
├── tests
│   └── test.js
├── tsconfig.json
└── vite.config.ts

### Environment Configuration
The database name is configurable through environment variables:
- `database_name`: Name of the D1 database (defaults to "cms-db-test" for local development)
- `DATABASE_ID`: The Cloudflare D1 database ID

These can be set in `.dev.vars` for local development.

## Development Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Create D1 database: `npx wrangler d1 create <<DB-NAME>>`
4. Update wrangler.toml with your database ID
5. Run the worker locally: `npx wrangler dev`
6. You'll want to use three terminal sessions. One for each service (blog front end, admin portal, cloudflare worker):

    ### Terminal 1 (in worker directory)
    npx wrangler dev

    ### Terminal 2 (in admin directory)
    npm run dev

    ### Terminal 3 (in blog directory)
    npm run dev

## References
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)

### Database Management

#### Setup and Migrations
The project uses Cloudflare D1 (SQLite) for the database. All database changes are managed through migrations in the `worker/migrations/sql` directory.

```bash
# Create a new D1 database
npx wrangler d1 create cms-db

# Run all migrations
npm run db:migrate

# Reset database with environment configuration (WARNING: This will delete all data)
npm run db:reset

# Override database name for a specific reset
database_name=custom-db-name npm run db:reset
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
curl h${API_URL}/debug/db

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

- Environment variables in .dev.vars for worker
- Frontend running on localhost:5174
- Worker running on localhost:8787

## Troubleshooting steps:
If necessary, you can reset the database with ``npm run db:reset`` >> warning! this will delete all the data in the database.

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

### Debugging Database
```bash
# View current database state
curl ${API_URL}/debug/db

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

# Then run your migrations again
npx wrangler d1 execute cms-db --local --file=./migrations/sql/0000_initial.sql && \
npx wrangler d1 execute cms-db --local --file=./migrations/sql/0001_meals_starter.sql
The project involves three cloudflare services:
1. Worker (port 8787): Handles API endpoints, database operations, and WebSocket connections
2. Admin Panel (port 5173): a Flow-bite Sveltekit based Interface for managing content
3. Blog (port 4174): Public-facing site based on a separate sveltekit repo

npx wrangler pages deploy .svelte-kit/cloudflare --project-name <name> --commit-dirty=true
npx wrangler pages deploy .svelte-kit/cloudflare --project-name <name> --commit-dirty=trueUmami integration? https://us.umami.is/share/HwZnyuHQ5Rqz3NWf/refact0r.dev

Things still to do
- Umami integration? https://us.umami.is/share/HwZnyuHQ5Rqz3NWf/refact0r.dev
- Color selector for background? 
- spinning wheel while photos upload? 
- Multiple users for a single domain. 
- Users can post and comment on posts, but only those authorized to the domain. 
