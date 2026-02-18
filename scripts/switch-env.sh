#!/bin/bash

# Environment Switcher Script for Land Mawe
# Usage: ./scripts/switch-env.sh [dev|prod]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

show_help() {
    echo "Land Mawe Environment Switcher"
    echo ""
    echo "Usage:"
    echo "  ./scripts/switch-env.sh dev   - Switch to development (local Supabase)"
    echo "  ./scripts/switch-env.sh prod  - Switch to production (Supabase Cloud)"
    echo ""
    echo "Current environment:"
    if grep -q "localhost:54321" .env 2>/dev/null; then
        echo "  DEVELOPMENT (Local)"
    else
        echo "  PRODUCTION (Cloud)"
    fi
}

switch_to_dev() {
    echo "🔄 Switching to DEVELOPMENT environment..."
    
    # Check if Supabase is installed
    if ! command -v supabase &> /dev/null; then
        echo "❌ Supabase CLI not found. Please install it first:"
        echo "   npm install -g supabase"
        exit 1
    fi
    
    # Check if Supabase is initialized
    if [ ! -d "$PROJECT_ROOT/supabase" ]; then
        echo "🆕 Initializing Supabase for the first time..."
        supabase init
    fi
    
    # Start local Supabase
    echo "🐳 Starting local Supabase (Docker)..."
    supabase start
    
    # Copy development env
    cp .env.development .env
    
    echo ""
    echo "✅ Development environment ready!"
    echo ""
    echo "Local Supabase:"
    echo "  • API URL: http://localhost:54321"
    echo "  • Studio (GUI): http://localhost:54323"
    echo ""
    echo "Next steps:"
    echo "  1. Run: npm run dev"
    echo "  2. Open: http://localhost:5173"
    echo ""
}

switch_to_prod() {
    echo "🔄 Switching to PRODUCTION environment..."
    echo ""
    echo "⚠️  WARNING: You are connecting to LIVE production database!"
    echo ""
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "❌ Cancelled."
        exit 0
    fi
    
    # Stop local Supabase
    echo "🛑 Stopping local Supabase..."
    supabase stop 2>/dev/null || true
    
    # Copy production env
    cp .env.production .env
    
    echo ""
    echo "✅ Production environment ready!"
    echo ""
    echo "⚠️  Connected to LIVE database at: https://fipbfnjzaamjayzqvlvg.supabase.co"
    echo ""
    echo "Next steps:"
    echo "  1. Run: npm run dev"
    echo "  2. Be careful with your changes!"
    echo ""
}

# Main
case "${1:-}" in
    dev|development)
        switch_to_dev
        ;;
    prod|production)
        switch_to_prod
        ;;
    *)
        show_help
        exit 1
        ;;
esac
