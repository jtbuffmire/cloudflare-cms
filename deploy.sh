#!/bin/bash

# Cloudflare CMS - Production Deployment Script
# Loads production environment, backs up database, runs migrations, and deploys

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_DIR="$SCRIPT_DIR/worker/backups"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                 Cloudflare CMS - Production Deployment                    ${NC}"
echo -e "${BLUE}                         $(date '+%Y-%m-%d %H:%M:%S')                              ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# =============================================================================
# STEP 0: Load Production Environment Variables
# =============================================================================
load_production_env() {
    if [ -f "$SCRIPT_DIR/.env.production" ]; then
        echo -e "${CYAN}Loading production environment from .env.production...${NC}"
        # Export all non-comment, non-empty lines
        set -a
        source "$SCRIPT_DIR/.env.production"
        set +a
        echo -e "${GREEN}  ✓ Loaded .env.production${NC}"
    else
        echo -e "${RED}Error: .env.production not found!${NC}"
        echo -e "${YELLOW}Create it from the template:${NC}"
        echo -e "  cp .env.template .env.production"
        echo -e "  # Then edit .env.production with production values"
        exit 1
    fi
}

generate_production_vite_env() {
    local dir=$1
    echo -e "${CYAN}Generating $dir/.env for production build...${NC}"
    cat > "$SCRIPT_DIR/$dir/.env" << EOF
# Auto-generated from .env.production by deploy.sh
# Do not edit directly - modify .env.production instead

VITE_API_URL=${VITE_API_URL}
VITE_API_VSN=${VITE_API_VSN:-/api/v1}
VITE_ENVIRONMENT=${VITE_ENVIRONMENT:-production}
VITE_WS_URL=${VITE_WS_URL}
EOF
    echo -e "${GREEN}  ✓ Generated $dir/.env${NC}"
}

# Load production environment first
load_production_env
echo ""

# Parse command line arguments
DEPLOY_WORKER=false
DEPLOY_ADMIN=false
DEPLOY_BLOG=false
SKIP_BACKUP=false
SKIP_MIGRATIONS=false
DRY_RUN=false

show_help() {
    echo "Usage: ./deploy.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --all              Deploy all services (default if no options specified)"
    echo "  --worker           Deploy worker only"
    echo "  --admin            Deploy admin panel only"
    echo "  --blog             Deploy blog only"
    echo "  --skip-backup      Skip database backup"
    echo "  --skip-migrations  Skip running migrations"
    echo "  --dry-run          Show what would be done without doing it"
    echo "  --help             Show this help message"
    echo ""
    echo "Environment:"
    echo "  This script loads .env.production from the project root."
    echo "  CLOUDFLARE_API_TOKEN is used for wrangler authentication."
    echo ""
    echo "By default, this script will:"
    echo "  1. Load production environment variables"
    echo "  2. Create a timestamped backup of the production database"
    echo "  3. Run any pending database migrations"
    echo "  4. Deploy the selected services"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh                    # Backup, migrate, deploy all"
    echo "  ./deploy.sh --worker           # Backup, migrate, deploy worker only"
    echo "  ./deploy.sh --skip-backup      # Skip backup, run migrations, deploy all"
    echo "  ./deploy.sh --dry-run          # Show what would happen"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            DEPLOY_WORKER=true
            DEPLOY_ADMIN=true
            DEPLOY_BLOG=true
            shift
            ;;
        --worker)
            DEPLOY_WORKER=true
            shift
            ;;
        --admin)
            DEPLOY_ADMIN=true
            shift
            ;;
        --blog)
            DEPLOY_BLOG=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# If no service-specific flags were set, deploy all services
if [ "$DEPLOY_WORKER" = false ] && [ "$DEPLOY_ADMIN" = false ] && [ "$DEPLOY_BLOG" = false ]; then
    DEPLOY_WORKER=true
    DEPLOY_ADMIN=true
    DEPLOY_BLOG=true
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: wrangler CLI not found${NC}"
    echo -e "${YELLOW}Install with: npm install -g wrangler${NC}"
    exit 1
fi

# Check for CLOUDFLARE_API_TOKEN
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${RED}Error: CLOUDFLARE_API_TOKEN not set${NC}"
    echo -e "${YELLOW}Make sure it's defined in .env.production${NC}"
    exit 1
fi
echo -e "${GREEN}✓ CLOUDFLARE_API_TOKEN is set${NC}"

# Verify Cloudflare authentication
echo -e "${YELLOW}Checking Cloudflare authentication...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}Cloudflare authentication failed${NC}"
    echo -e "${YELLOW}Check that your CLOUDFLARE_API_TOKEN has the correct permissions:${NC}"
    echo -e "  - Workers Scripts: Edit"
    echo -e "  - D1: Edit"
    echo -e "  - R2: Edit"
    echo -e "  - Cloudflare Pages: Edit"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated with Cloudflare${NC}"
echo ""

# Show deployment plan
echo -e "${CYAN}Deployment Plan:${NC}"
echo -e "  0. ${GREEN}✓${NC} Production environment loaded"
if [ "$SKIP_BACKUP" = false ]; then
    echo -e "  1. ${BLUE}Backup${NC} production database → backups/backup-$TIMESTAMP.sql"
else
    echo -e "  1. ${YELLOW}Skip${NC} database backup"
fi
if [ "$SKIP_MIGRATIONS" = false ]; then
    echo -e "  2. ${BLUE}Run${NC} pending database migrations"
else
    echo -e "  2. ${YELLOW}Skip${NC} database migrations"
fi
echo -e "  3. ${BLUE}Deploy${NC} services:"
if [ "$DEPLOY_WORKER" = true ]; then echo -e "     • Worker (API)"; fi
if [ "$DEPLOY_ADMIN" = true ]; then echo -e "     • Admin Panel"; fi
if [ "$DEPLOY_BLOG" = true ]; then echo -e "     • Blog Frontend"; fi
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN - No changes will be made${NC}"
    echo ""
fi

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi
echo ""

# ============================================================================
# STEP 1: Backup Database
# ============================================================================
if [ "$SKIP_BACKUP" = false ]; then
    echo -e "${BLUE}━━━ Step 1: Backing up production database ━━━${NC}"
    
    # Create backups directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.sql"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would backup to: $BACKUP_FILE${NC}"
    else
        cd "$SCRIPT_DIR/worker"
        
        # Temporarily unset API token for D1 operations - use wrangler OAuth session instead
        SAVED_API_TOKEN_BACKUP="$CLOUDFLARE_API_TOKEN"
        unset CLOUDFLARE_API_TOKEN
        
        # Export the database
        echo -e "${CYAN}Exporting production database...${NC}"
        if wrangler d1 export cms-db --remote --output="$BACKUP_FILE" 2>/dev/null; then
            BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
            echo -e "${GREEN}✓ Database backed up: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
        else
            echo -e "${YELLOW}⚠ Could not use d1 export, trying alternative method...${NC}"
            # Alternative: dump tables manually
            if wrangler d1 execute cms-db --remote --command=".dump" > "$BACKUP_FILE" 2>/dev/null; then
                BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
                echo -e "${GREEN}✓ Database backed up: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
            else
                echo -e "${RED}✗ Database backup failed${NC}"
                read -p "Continue deployment anyway? (y/N) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    exit 1
                fi
            fi
        fi
        
        # Restore API token
        if [ -n "$SAVED_API_TOKEN_BACKUP" ]; then
            export CLOUDFLARE_API_TOKEN="$SAVED_API_TOKEN_BACKUP"
        fi
        
        cd "$SCRIPT_DIR"
    fi
    echo ""
else
    echo -e "${YELLOW}━━━ Step 1: Skipping database backup ━━━${NC}"
    echo ""
fi

# ============================================================================
# STEP 2: Run Migrations
# ============================================================================
if [ "$SKIP_MIGRATIONS" = false ]; then
    echo -e "${BLUE}━━━ Step 2: Running database migrations ━━━${NC}"
    
    MIGRATIONS_DIR="$SCRIPT_DIR/worker/migrations/sql"
    
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        echo -e "${RED}Migrations directory not found: $MIGRATIONS_DIR${NC}"
        exit 1
    fi
    
    cd "$SCRIPT_DIR/worker"
    
    # Temporarily unset API token for D1 operations - use wrangler OAuth session instead
    # (The API token may not have D1 permissions)
    SAVED_API_TOKEN="$CLOUDFLARE_API_TOKEN"
    unset CLOUDFLARE_API_TOKEN
    
    # Get list of already-applied migrations from the database
    echo -e "${CYAN}Checking for already-applied migrations...${NC}"
    # Query the _migrations table for already-applied migrations (read-only, safe for dry-run)
    APPLIED_MIGRATIONS=$(wrangler d1 execute cms-db --remote --command="SELECT name FROM _migrations" --json 2>&1 | grep '"name"' | sed 's/.*"name": *"\([^"]*\)".*/\1/' || echo "")
    
    # Get list of migration files
    MIGRATION_FILES=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)
    
    if [ -z "$MIGRATION_FILES" ]; then
        echo -e "${YELLOW}No migration files found${NC}"
    else
        # Determine which migrations need to run
        PENDING_MIGRATIONS=""
        echo -e "${CYAN}Migration status:${NC}"
        for file in $MIGRATION_FILES; do
            filename=$(basename "$file")
            # Extract migration name (remove .sql extension)
            migration_name="${filename%.sql}"
            
            # Check if this migration has already been applied
            if echo "$APPLIED_MIGRATIONS" | grep -q "$migration_name"; then
                echo -e "  ${GREEN}✓${NC} $filename (already applied)"
            else
                echo -e "  ${YELLOW}○${NC} $filename (pending)"
                PENDING_MIGRATIONS="$PENDING_MIGRATIONS $file"
            fi
        done
        echo ""
        
        if [ -z "$PENDING_MIGRATIONS" ]; then
            echo -e "${GREEN}All migrations have already been applied${NC}"
        else
            if [ "$DRY_RUN" = true ]; then
                echo -e "${YELLOW}[DRY RUN] Would run pending migrations:${NC}"
                for file in $PENDING_MIGRATIONS; do
                    echo -e "  • $(basename "$file")"
                done
            else
                echo -e "${CYAN}Running pending migrations...${NC}"
                
                for file in $PENDING_MIGRATIONS; do
                    filename=$(basename "$file")
                    echo -e "${CYAN}Running: $filename${NC}"
                    
                    if wrangler d1 execute cms-db --remote --file="$file" 2>&1; then
                        echo -e "${GREEN}  ✓ $filename completed${NC}"
                    else
                        echo -e "${RED}  ✗ $filename failed${NC}"
                        read -p "Continue with remaining migrations? (y/N) " -n 1 -r
                        echo
                        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                            cd "$SCRIPT_DIR"
                            exit 1
                        fi
                    fi
                done
            fi
        fi
    fi
    
    # Restore API token
    if [ -n "$SAVED_API_TOKEN" ]; then
        export CLOUDFLARE_API_TOKEN="$SAVED_API_TOKEN"
    fi
    
    cd "$SCRIPT_DIR"
    echo ""
else
    echo -e "${YELLOW}━━━ Step 2: Skipping database migrations ━━━${NC}"
    echo ""
fi

# ============================================================================
# STEP 3: Deploy Services
# ============================================================================
echo -e "${BLUE}━━━ Step 3: Deploying services ━━━${NC}"

# Deploy Worker
if [ "$DEPLOY_WORKER" = true ]; then
    echo -e "${CYAN}Deploying Worker (API)...${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would deploy worker${NC}"
    else
        cd "$SCRIPT_DIR/worker"
        
        # Deploy to production environment (uses production database)
        if wrangler deploy --env production; then
            echo -e "${GREEN}✓ Worker deployed successfully${NC}"
        else
            echo -e "${RED}✗ Worker deployment failed${NC}"
            exit 1
        fi
        cd "$SCRIPT_DIR"
    fi
    echo ""
fi

# Deploy Admin Panel
if [ "$DEPLOY_ADMIN" = true ]; then
    echo -e "${CYAN}Deploying Admin Panel...${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would deploy admin panel${NC}"
    else
        # Generate production .env for Vite build
        generate_production_vite_env "admin"
        
        cd "$SCRIPT_DIR/admin"
        
        if npm run deploy; then
            echo -e "${GREEN}✓ Admin Panel deployed successfully${NC}"
        else
            echo -e "${RED}✗ Admin Panel deployment failed${NC}"
            exit 1
        fi
        cd "$SCRIPT_DIR"
    fi
    echo ""
fi

# Deploy Blog
if [ "$DEPLOY_BLOG" = true ]; then
    echo -e "${CYAN}Deploying Blog...${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would deploy blog${NC}"
    else
        # Generate production .env for Vite build
        generate_production_vite_env "blog"
        
        cd "$SCRIPT_DIR/blog"
        
        if npm run deploy; then
            echo -e "${GREEN}✓ Blog deployed successfully${NC}"
        else
            echo -e "${RED}✗ Blog deployment failed${NC}"
            exit 1
        fi
        cd "$SCRIPT_DIR"
    fi
    echo ""
fi

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}                         Dry Run Complete                               ${NC}"
else
    echo -e "${GREEN}                         Deployment Complete! 🎉                          ${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
    echo -e "${CYAN}Summary:${NC}"
    if [ "$SKIP_BACKUP" = false ]; then
        echo -e "  • Database backup: backups/backup-$TIMESTAMP.sql"
    fi
    if [ "$SKIP_MIGRATIONS" = false ]; then
        echo -e "  • Migrations: Applied"
    fi
    echo -e "  • Deployed at: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo -e "${YELLOW}Verify your deployments:${NC}"
    if [ "$DEPLOY_WORKER" = true ]; then echo -e "  • API: https://api.buffmire.com/api/v1/site/config"; fi
    if [ "$DEPLOY_ADMIN" = true ]; then echo -e "  • Admin: https://admin.buffmire.com"; fi
    if [ "$DEPLOY_BLOG" = true ]; then echo -e "  • Blog: https://buffmire.com"; fi
fi
echo ""
