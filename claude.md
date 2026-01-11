# Cloudflare CMS - Project Overview

> A domain-agnostic, serverless blogging platform built entirely on Cloudflare's edge infrastructure.

## Quick Start

```bash
# Development (starts all three services)
./dev.sh

# Production deployment
./deploy.sh
```

## Architecture

This is a **monorepo** containing three interconnected services that work together to provide a complete blogging platform:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOUDFLARE EDGE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Blog Frontend │    │  Admin Panel    │    │ Worker (API)    │         │
│  │   (SvelteKit)   │◄──►│  (SvelteKit)    │◄──►│ (CF Worker)     │         │
│  │   Port: 4174    │    │  Port: 5173     │    │ Port: 8787      │         │
│  │   Unauthenticated│   │  Authenticated  │    │                 │         │
│  └─────────────────┘    └─────────────────┘    └────────┬────────┘         │
│           │                      │                       │                  │
│           │                      │                       │                  │
│           └──────────────────────┴───────────────────────┘                  │
│                                  │                                          │
│                    ┌─────────────┴─────────────┐                           │
│                    │                           │                           │
│              ┌─────▼─────┐              ┌──────▼──────┐                    │
│              │    D1     │              │     R2      │                    │
│              │ (SQLite)  │              │  (Storage)  │                    │
│              └───────────┘              └─────────────┘                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Durable Objects (WebSockets)                      │   │
│  │                    Real-time updates between services                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Concept: Domain Agnosticism

**All three services are domain-agnostic.** The request's `Host` header (or `X-Site-Domain` header) determines which site's content to serve. This means:

- A single deployment serves multiple domains/blogs
- All user data lives in one D1 database, partitioned by `domain` column
- R2 storage uses domain-prefixed keys for isolation
- Each domain has its own `site_config`, `posts`, `pics`, and `users`

### Example Domain Flow

```
Request to buffmire.com     → Worker extracts domain → Queries WHERE domain='buffmire.com'
Request to mealsonwheels.com → Worker extracts domain → Queries WHERE domain='mealsonwheels.com'
Request to admin.buffmire.com → Admin panel → API uses 'buffmire.com' domain
```

## Directory Structure

```
cloudflare-cms/
├── claude.md              # This file - project documentation
├── dev.sh                 # Start all services for development
├── deploy.sh              # Deploy to production
├── .env.template          # Template for environment variables
├── package.json           # Root package with shared dependencies
│
├── worker/                # Backend API (Cloudflare Worker)
│   ├── src/
│   │   ├── index.ts       # Worker entry point
│   │   ├── router.ts      # Route definitions
│   │   ├── types.ts       # TypeScript types & Env interface
│   │   ├── handlers/      # Route handlers
│   │   │   ├── auth.ts    # Login/logout
│   │   │   ├── posts.ts   # Blog posts CRUD
│   │   │   ├── pics.ts    # Image management
│   │   │   ├── site.ts    # Site configuration
│   │   │   ├── projects.ts # Projects CRUD
│   │   │   └── animations.ts # Lottie animations
│   │   ├── middleware/
│   │   │   ├── auth.ts    # JWT verification
│   │   │   └── cors.ts    # CORS handling
│   │   ├── durable_objects/
│   │   │   └── WebSocketHandler.ts  # Real-time updates
│   │   └── lib/
│   │       └── config.ts  # API versioning, allowed origins
│   ├── migrations/
│   │   └── sql/           # D1 migration files
│   ├── wrangler.toml      # Cloudflare configuration
│   └── .dev.vars          # Local environment variables (gitignored)
│
├── admin/                 # Admin Panel (SvelteKit + Flowbite)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +page.svelte      # Dashboard
│   │   │   ├── login/            # Authentication
│   │   │   ├── posts/            # Post management
│   │   │   ├── pics/             # Image gallery
│   │   │   ├── projects/         # Project management
│   │   │   ├── site/             # Site configuration
│   │   │   └── animations/       # Animation selector
│   │   └── lib/
│   │       ├── config.ts         # API endpoint configuration
│   │       └── components/       # Reusable components
│   └── svelte.config.js          # Uses @sveltejs/adapter-cloudflare
│
├── blog/                  # Public Frontend (SvelteKit)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +page.svelte      # Homepage
│   │   │   ├── blog/             # Blog listing & posts
│   │   │   ├── about/            # About page
│   │   │   ├── contact/          # Contact form
│   │   │   ├── pics/             # Photo gallery
│   │   │   └── projects/         # Portfolio
│   │   └── lib/
│   │       ├── stores.ts         # Svelte stores with WebSocket updates
│   │       ├── websocket.ts      # WebSocket client
│   │       └── config.ts         # API configuration
│   └── svelte.config.js          # Uses @sveltejs/adapter-cloudflare
│
└── docs/                  # Additional documentation
    ├── api.md             # API specifications
    └── websocket.md       # WebSocket protocol
```

## Services

### 1. Worker (`/worker`) - Port 8787

The Cloudflare Worker serves as the **API middleware** between frontends and Cloudflare services.

**Key Features:**
- RESTful API at `/api/v1/*`
- JWT authentication with `@tsndr/cloudflare-worker-jwt`
- D1 (SQLite) database for structured data
- R2 bucket for media storage
- Durable Objects for WebSocket connections
- CORS handling for cross-origin requests

**Environment Variables:**
```bash
JWT_SECRET="your-jwt-secret"
ADMIN_EMAIL="user1@example.com,user2@example.com"  # Comma-separated for multiple users
ADMIN_PASSWORD="pass1,pass2"                        # Matching passwords
ENVIRONMENT="development"                           # or "production"
DATABASE_ID="your-d1-database-id"
ALLOWED_ORIGINS="https://admin.buffmire.com,https://buffmire.com"
```

**API Endpoints:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/login` | No | Authenticate user |
| GET | `/api/v1/verify` | Yes | Verify JWT token |
| GET | `/api/v1/posts` | No | List published posts |
| GET | `/api/v1/posts/:id` | No | Get single post |
| POST | `/api/v1/posts` | Yes | Create post |
| PUT | `/api/v1/posts/:id` | Yes | Update post |
| DELETE | `/api/v1/posts/:id` | Yes | Delete post |
| GET | `/api/v1/pics` | No | List pictures |
| GET | `/api/v1/pics/:id` | No | Get picture file |
| POST | `/api/v1/pics` | Yes | Upload picture |
| DELETE | `/api/v1/pics/:id` | Yes | Delete picture |
| GET | `/api/v1/site/config` | No | Get site configuration |
| PUT | `/api/v1/site/config` | Yes | Update site configuration |
| GET | `/api/v1/projects` | No | List projects |
| POST | `/api/v1/projects` | Yes | Create project |
| PUT | `/api/v1/projects/:id` | Yes | Update project |
| DELETE | `/api/v1/projects/:id` | Yes | Delete project |
| GET | `/api/v1/animations` | No | List animations |
| POST | `/api/v1/animations` | Yes | Upload animation |
| WS | `/ws?domain=X` | No | WebSocket connection |

### 2. Admin Panel (`/admin`) - Port 5173

Authenticated content management interface built with SvelteKit and Flowbite.

**Features:**
- Login/logout with JWT
- Rich text editor for posts (TipTap-based)
- Media library with drag-and-drop upload
- Site configuration editor
- Project portfolio management
- Lottie animation selector

**Authentication Flow:**
1. User visits `admin.domain.com` or `localhost:5173`
2. Redirected to login if no valid token
3. Credentials sent to `/api/v1/login`
4. JWT stored in `localStorage`
5. All protected routes include `Authorization: Bearer <token>`

### 3. Blog Frontend (`/blog`) - Port 4174

Public-facing blog with server-side rendering and real-time updates.

**Features:**
- SSR with SvelteKit
- WebSocket subscription for live updates
- SEO-optimized pages
- Responsive design
- MDsveX for markdown content (local files supported)
- Dynamic content from API

**WebSocket Events:**
```typescript
// The blog subscribes to these events for real-time updates:
- SITE_CONFIG_UPDATE  // Site title, description, nav changed
- POSTS_UPDATE        // Posts list changed
- POST_UPDATE         // Single post edited
- POST_CREATE         // New post created
- POST_DELETE         // Post deleted
```

## Database Schema

The D1 database contains these tables:

### `users`
```sql
id TEXT PRIMARY KEY,
email TEXT NOT NULL,
password TEXT NOT NULL,
domain TEXT NOT NULL,
role TEXT DEFAULT 'admin',
created_at DATETIME,
UNIQUE(email, domain)
```

### `site_config`
```sql
domain TEXT NOT NULL UNIQUE,
title TEXT,
description TEXT,
nav_links JSON,  -- {"blog": true, "about": true, ...}
lottie_animation TEXT,
about_description TEXT,
about_section_headers JSON,
about_section_contents JSON,
contact_* fields,
pics_description TEXT,
web3forms_key TEXT
```

### `posts`
```sql
id INTEGER PRIMARY KEY,
domain TEXT NOT NULL,
title TEXT,
content TEXT,
markdown_content TEXT,
html_content TEXT,
metadata JSON,
slug TEXT,
published BOOLEAN,
show_date BOOLEAN,
published_at DATETIME,
created_at DATETIME,
UNIQUE(domain, slug)
```

### `pics`
```sql
id INTEGER PRIMARY KEY,
domain TEXT NOT NULL,
filename TEXT,
r2_key TEXT,
mime_type TEXT,
width INTEGER,
height INTEGER,
published BOOLEAN,
show_in_pics BOOLEAN,
text_description TEXT,
-- EXIF data fields
-- Color information
-- etc.
```

### `projects`
```sql
id INTEGER PRIMARY KEY,
domain TEXT NOT NULL,
name TEXT,
description TEXT,
slug TEXT,
content TEXT,
thumbnail TEXT,
images JSON,
github TEXT,
website TEXT,
published BOOLEAN,
created_at DATETIME,
UNIQUE(domain, slug)
```

### `animations`
```sql
id INTEGER PRIMARY KEY,
domain TEXT NOT NULL,
name TEXT,
r2_key TEXT,
scale_factor INTEGER DEFAULT 100,
UNIQUE(domain, name)
```

## Environment Variables

Environment variables are consolidated into a single location at the project root.

### File Structure

```
cloudflare-cms/
├── .env.template      # Committed - template with placeholders
├── .env               # Gitignored - local development values
├── .env.production    # Gitignored - production secrets
```

### How It Works

| Script | Loads | Generates |
|--------|-------|-----------|
| `dev.sh` | `.env` | `worker/.dev.vars`, `blog/.env`, `admin/.env` |
| `deploy.sh` | `.env.production` | `blog/.env`, `admin/.env` (for build) |

The scripts automatically generate service-specific env files from the root `.env` files.

### Variables Reference

| Variable | Used By | Description |
|----------|---------|-------------|
| `CLOUDFLARE_API_TOKEN` | deploy.sh | Wrangler authentication |
| `JWT_SECRET` | Worker | Token signing secret |
| `ADMIN_EMAIL` | Worker | Comma-separated admin emails |
| `ADMIN_PASSWORD` | Worker | Comma-separated passwords (matching order) |
| `ENVIRONMENT` | Worker | `development` or `production` |
| `DATABASE_ID` | Worker | D1 database ID |
| `ALLOWED_ORIGINS` | Worker | CORS allowed origins |
| `SESSION_DURATION` | Worker | Token expiry in seconds |
| `VITE_API_URL` | Blog, Admin | API base URL |
| `VITE_API_VSN` | Blog, Admin | API version prefix (`/api/v1`) |
| `VITE_ENVIRONMENT` | Blog, Admin | Environment name |
| `VITE_WS_URL` | Blog, Admin | WebSocket URL |

## Development Workflow

### Prerequisites
- Node.js 18+
- npm or bun
- Cloudflare account (for production)
- Wrangler CLI (`npm install -g wrangler`)

### First-Time Setup

```bash
# 1. Clone and install dependencies
git clone <repo>
cd cloudflare-cms
npm install
cd worker && npm install && cd ..
cd admin && npm install && cd ..
cd blog && npm install && cd ..

# 2. Create your environment file from template
cp .env.template .env

# 3. Edit .env with your development values
#    - Set JWT_SECRET (generate with: openssl rand -base64 32)
#    - Set ADMIN_EMAIL and ADMIN_PASSWORD
#    - Set DATABASE_ID (find with: npx wrangler d1 list)

# 4. Create local D1 database
cd worker
npx wrangler d1 create cms-db-dev --local
npx wrangler d1 execute cms-db-dev --local --file=./migrations/sql/0000_initial.sql

# 5. Start development (automatically loads .env and generates service configs)
cd ..
./dev.sh
```

### Daily Development

```bash
# Start all services (loads .env, generates configs, starts services)
./dev.sh

# Services will be available at:
# - Worker API:   http://localhost:8787
# - Admin Panel:  http://localhost:5173
# - Blog:         http://localhost:4174
```

### Database Operations

```bash
cd worker

# Reset local database (WARNING: deletes all data)
npm run db:reset:dev

# Run migrations
npm run db:migrate

# Backup production database
npm run db:backup

# Execute SQL directly
npx wrangler d1 execute cms-db-dev --local --command="SELECT * FROM posts;"
```

## Production Deployment

### DNS Configuration

For each domain (e.g., `buffmire.com`):
```
api.buffmire.com    → Cloudflare Worker
admin.buffmire.com  → Cloudflare Pages (admin)
buffmire.com        → Cloudflare Pages (blog)
www.buffmire.com    → CNAME to buffmire.com
```

### First-Time Production Setup

```bash
# 1. Create production environment file
cp .env.template .env.production

# 2. Edit .env.production with production values:
#    - CLOUDFLARE_API_TOKEN (create at dash.cloudflare.com/profile/api-tokens)
#    - JWT_SECRET (different from development!)
#    - ADMIN_EMAIL, ADMIN_PASSWORD (real credentials)
#    - DATABASE_ID (production database)
#    - VITE_API_URL (e.g., https://api.buffmire.com)
#    - ALLOWED_ORIGINS (production domains)

# 3. Also set secrets in Cloudflare dashboard as backup
cd worker
wrangler secret put JWT_SECRET
wrangler secret put ADMIN_EMAIL
wrangler secret put ADMIN_PASSWORD
```

### Deploying

The deploy script automatically:
1. Loads `.env.production`
2. Creates a timestamped database backup
3. Runs pending migrations
4. Deploys selected services

```bash
# Deploy everything (backup → migrate → deploy all)
./deploy.sh

# Deploy only specific services
./deploy.sh --worker
./deploy.sh --admin --blog

# Skip backup or migrations
./deploy.sh --skip-backup
./deploy.sh --skip-migrations

# Preview what would happen
./deploy.sh --dry-run
```

## Adding New Domains/Users

1. **Add user credentials to environment files:**
   ```bash
   # In .env (development) and .env.production
   ADMIN_EMAIL="existing@email.com,newuser@newdomain.com"
   ADMIN_PASSWORD="existingpass,newpassword"
   
   # Also update Cloudflare secrets
   cd worker && wrangler secret put ADMIN_EMAIL
   cd worker && wrangler secret put ADMIN_PASSWORD
   ```

2. **Add to database (via migration or direct SQL):**
   ```sql
   INSERT INTO users (id, email, password, domain, role)
   VALUES ('usr_newdomain', 'admin@newdomain.com', 'hashed_password', 'newdomain.com', 'admin');
   
   INSERT INTO site_config (domain, title, description, nav_links)
   VALUES ('newdomain.com', 'New Site', 'Description', '{"blog":true,"about":true}');
   ```

3. **Update ALLOWED_ORIGINS** in `.env.production`:
   ```bash
   ALLOWED_ORIGINS=...,https://newdomain.com,https://admin.newdomain.com
   ```

4. **Configure DNS** for the new domain pointing to Cloudflare services.

## Common Tasks

### Create a New Blog Post (via Admin)
1. Visit `http://localhost:5173` or `admin.yourdomain.com`
2. Login with credentials
3. Navigate to Posts → New Post
4. Write content, add metadata, set slug
5. Toggle "Published" and save

### Upload Images
1. In Admin, go to Pics
2. Drag-and-drop or click to upload
3. Images are stored in R2, metadata in D1
4. Use in posts via the image selector

### Modify Site Configuration
1. In Admin, go to Site
2. Edit title, description, navigation links
3. Configure about page sections
4. Set up contact information
5. Choose Lottie animation for homepage

## ⚠️ CRITICAL: Database Migration Safety

**NEVER include DROP TABLE or DELETE statements in migration files.**

Migration files in `worker/migrations/sql/` can be re-run by the deploy script. Any destructive SQL will **destroy production data**.

### Migration Rules
1. **Use `CREATE TABLE IF NOT EXISTS`** - Safe to re-run
2. **Use `INSERT OR IGNORE`** - Won't fail if data exists
3. **Use `ALTER TABLE ADD COLUMN`** - May fail if column exists, but won't destroy data
4. **NEVER use `DROP TABLE`** - Will delete all data
5. **NEVER use `DELETE FROM`** - Will delete data
6. **NEVER use `TRUNCATE`** - Will delete all data

### How Migrations Work
- The `_migrations` table tracks which migrations have been applied
- `deploy.sh` queries this table and only runs pending migrations
- Each migration should end with: `INSERT OR REPLACE INTO _migrations (name) VALUES ('migration_name');`

### Recovery from Bad Migration
If a migration destroys data, use **D1 Time Travel**:
```bash
# Find a restore point (before the bad migration)
wrangler d1 time-travel info cms-db --timestamp "2025-01-11T04:00:00Z"

# Restore to that point
wrangler d1 time-travel restore cms-db --bookmark=<bookmark-from-above>
```

D1 keeps 30 days of history. Always take a backup before deploying.

---

## Troubleshooting

### "Unauthorized" errors
- Check JWT_SECRET matches across services
- Verify token hasn't expired (24h default)
- Check Authorization header format: `Bearer <token>`

### Database connection errors
- Verify DATABASE_ID in wrangler.toml
- Run migrations: `npm run db:migrate`
- Reset if needed: `npm run db:reset:dev`

### CORS errors
- Check ALLOWED_ORIGINS in worker env
- Verify request origin matches allowed list
- In dev, localhost ports must match config

### WebSocket not connecting
- Ensure worker is running on port 8787
- Check `?domain=` parameter in WS URL
- Look for errors in worker console logs

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Worker/API | Cloudflare Workers (TypeScript) |
| Database | Cloudflare D1 (SQLite) |
| File Storage | Cloudflare R2 |
| Real-time | Durable Objects (WebSocket) |
| Admin UI | SvelteKit 5 + Flowbite + Tailwind |
| Blog UI | SvelteKit 4 + SCSS |
| Auth | JWT (@tsndr/cloudflare-worker-jwt) |
| Rich Text | TipTap |
| Animations | Lottie |

## Version History

- **Current Branch:** `try-svelte-5` (Svelte 5 migration in progress)
- **Svelte Versions:** Admin uses Svelte 5, Blog uses Svelte 4
- **Last Major Update:** January 2025

## Future Improvements (TODO)

- [ ] Umami analytics integration
- [ ] Color theme selector
- [ ] Loading spinners for uploads
- [ ] Multiple users per domain
- [ ] User comments on posts
- [ ] Rate limiting for production
- [ ] WebSocket authentication
