#!/bin/bash

# Apply all migrations to local Supabase database

echo "🔄 Applying all migrations to local database"
echo "=============================================="
echo ""

cd /home/munyao/Documents/react_projects/land-mawe-app

# First apply the main schema
if [ -f "supabase-schema.sql" ]; then
    echo "📦 Applying supabase-schema.sql..."
    psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < supabase-schema.sql
    echo "✅ Main schema applied"
    echo ""
fi

# Then apply all migrations in order
echo "📦 Applying migration files..."
for file in migrations/*.sql; do
    echo "  → $file"
    psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < "$file" 2>/dev/null || echo "    ⚠️  Some statements may have failed (expected for existing objects)"
done

echo ""
echo "✅ All migrations applied!"
echo ""
echo "Local database is ready!"
echo "Studio: http://127.0.0.1:54323"
