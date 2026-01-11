#!/bin/bash

# Cloudflare CMS - Development Script
# Loads environment variables and starts all three services concurrently

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

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                    Cloudflare CMS - Development Mode                      ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# =============================================================================
# STEP 1: Load Environment Variables
# =============================================================================
load_env() {
    if [ -f "$SCRIPT_DIR/.env" ]; then
        echo -e "${CYAN}Loading environment variables from .env...${NC}"
        # Export all non-comment, non-empty lines
        set -a
        source "$SCRIPT_DIR/.env"
        set +a
        echo -e "${GREEN}  ✓ Loaded .env${NC}"
    else
        echo -e "${RED}Error: .env not found!${NC}"
        echo -e "${YELLOW}Create it from the template:${NC}"
        echo -e "  cp .env.template .env"
        echo -e "  # Then edit .env with your values"
        exit 1
    fi
}

# =============================================================================
# STEP 2: Generate Service-Specific Environment Files
# =============================================================================
generate_worker_vars() {
    echo -e "${CYAN}Generating worker/.dev.vars...${NC}"
    cat > "$SCRIPT_DIR/worker/.dev.vars" << EOF
# Auto-generated from root .env by dev.sh
# Do not edit directly - modify .env instead

ENVIRONMENT=${ENVIRONMENT:-development}
JWT_SECRET=${JWT_SECRET}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
DATABASE_ID=${DATABASE_ID}
SESSION_DURATION=${SESSION_DURATION:-86400}
ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
EOF
    echo -e "${GREEN}  ✓ Generated worker/.dev.vars${NC}"
}

generate_vite_env() {
    local dir=$1
    echo -e "${CYAN}Generating $dir/.env...${NC}"
    cat > "$SCRIPT_DIR/$dir/.env" << EOF
# Auto-generated from root .env by dev.sh
# Do not edit directly - modify .env instead

VITE_API_URL=${VITE_API_URL:-http://localhost:8787}
VITE_API_VSN=${VITE_API_VSN:-/api/v1}
VITE_ENVIRONMENT=${VITE_ENVIRONMENT:-development}
VITE_WS_URL=${VITE_WS_URL:-ws://localhost:8787}
EOF
    echo -e "${GREEN}  ✓ Generated $dir/.env${NC}"
}

# Load environment and generate service files
load_env
echo ""
generate_worker_vars
generate_vite_env "blog"
generate_vite_env "admin"
echo ""

# =============================================================================
# STEP 3: Check Dependencies
# =============================================================================
# Check if required directories exist
for dir in worker admin blog; do
    if [ ! -d "$SCRIPT_DIR/$dir" ]; then
        echo -e "${RED}Error: $dir directory not found${NC}"
        exit 1
    fi
done

# Check for node_modules in each directory
echo -e "${YELLOW}Checking dependencies...${NC}"
missing_deps=false

for dir in worker admin blog; do
    if [ ! -d "$SCRIPT_DIR/$dir/node_modules" ]; then
        echo -e "${RED}  ✗ $dir/node_modules not found${NC}"
        missing_deps=true
    else
        echo -e "${GREEN}  ✓ $dir dependencies installed${NC}"
    fi
done

if [ "$missing_deps" = true ]; then
    echo ""
    echo -e "${YELLOW}Installing missing dependencies...${NC}"
    for dir in worker admin blog; do
        if [ ! -d "$SCRIPT_DIR/$dir/node_modules" ]; then
            echo -e "${BLUE}  Installing $dir dependencies...${NC}"
            (cd "$SCRIPT_DIR/$dir" && npm install)
        fi
    done
fi

# =============================================================================
# STEP 3.5: Run Local Database Migrations
# =============================================================================
echo ""
echo -e "${YELLOW}Running local database migrations...${NC}"
cd "$SCRIPT_DIR/worker"

# Run all migration files in order
for migration in migrations/sql/*.sql; do
    if [ -f "$migration" ]; then
        migration_name=$(basename "$migration")
        # Suppress output, just show success/failure
        if wrangler d1 execute cms-db-dev --local --file="$migration" > /dev/null 2>&1; then
            echo -e "${GREEN}  ✓ $migration_name${NC}"
        else
            echo -e "${YELLOW}  ⚠ $migration_name (may already be applied)${NC}"
        fi
    fi
done
cd "$SCRIPT_DIR"

# =============================================================================
# STEP 4: Start Services
# =============================================================================
echo ""
echo -e "${GREEN}Starting all services...${NC}"
echo ""
echo -e "  ${BLUE}Worker API${NC}   → http://localhost:8787"
echo -e "  ${BLUE}Admin Panel${NC}  → http://localhost:5173"
echo -e "  ${BLUE}Blog${NC}         → http://localhost:4174"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"
    kill 0
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start all services in parallel
# Using different colors for each service output
# Ports are configured in each service's vite.config.ts:
#   - worker: 8787 (wrangler default)
#   - admin: 5173
#   - blog: 4174
(cd "$SCRIPT_DIR/worker" && npm run dev 2>&1 | sed 's/^/[worker] /') &
(cd "$SCRIPT_DIR/admin" && npm run dev 2>&1 | sed 's/^/[admin]  /') &
(cd "$SCRIPT_DIR/blog" && npm run dev 2>&1 | sed 's/^/[blog]   /') &

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        # Include X-Site-Domain header for API requests
        if curl -s -o /dev/null -w "%{http_code}" -H "X-Site-Domain: localhost" "$url" 2>/dev/null | grep -q "200\|304\|101"; then
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    return 1
}

# Open browsers after services are ready (run in background)
(
    echo -e "${YELLOW}Waiting for services to start...${NC}"
    
    # Wait for worker API to be ready
    if wait_for_service "http://localhost:8787/api/v1/posts" "Worker"; then
        echo -e "${GREEN}  ✓ Worker API ready${NC}"
    fi
    
    # Wait for admin panel
    if wait_for_service "http://localhost:5173" "Admin"; then
        echo -e "${GREEN}  ✓ Admin Panel ready${NC}"
    fi
    
    # Wait for blog
    if wait_for_service "http://localhost:4174" "Blog"; then
        echo -e "${GREEN}  ✓ Blog ready${NC}"
    fi
    
    # Small additional delay for full initialization
    sleep 2
    
    echo ""
    echo -e "${GREEN}Opening browsers...${NC}"
    
    # Open in default browser (works on macOS)
    if command -v open &> /dev/null; then
        open "http://localhost:4174"   # Blog
        sleep 0.5
        open "http://localhost:5173"   # Admin
    # Linux alternative
    elif command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:4174"
        sleep 0.5
        xdg-open "http://localhost:5173"
    fi
    
    echo -e "${GREEN}  ✓ Browsers opened${NC}"
) &

# Wait for all background processes
wait
