# Development Environment Setup Guide

## Goal
Separate dev and production environments so you can test freely without affecting live data.

## Architecture
```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Development   │      │     Git Push     │      │   Production    │
│   (Your PC)     │ ───> │   (GitHub)       │ ───> │   (Vercel)      │
│                 │      │                  │      │                 │
│ • Local Supabase│      │ • Triggers       │      │ • Supabase      │
│   (Docker)      │      │   deployment     │      │   Cloud (Live)  │
│ • Local server  │      │                  │      │ • Live API      │
│ • Test data     │      │                  │      │ • Real data     │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

---

## Step 1: Install Supabase CLI

```bash
# Using npm
npm install -g supabase

# Or using Homebrew (Mac)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

---

## Step 2: Initialize Local Supabase

```bash
# In your project root
cd /home/munyao/Documents/react_projects/land-mawe-app

# Initialize Supabase (creates docker-compose setup)
supabase init

# Start local Supabase (takes ~2 minutes first time)
supabase start
```

After starting, you'll see local credentials:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323 (GUI to view database)
```

---

## Step 3: Set Up Environment Switching

### Option A: Manual Switch (Recommended)

Create two terminal aliases:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias lmdev='cd /home/munyao/Documents/react_projects/land-mawe-app && cp .env.development .env && supabase start && npm run dev'
alias lmprod='cd /home/munyao/Documents/react_projects/land-mawe-app && cp .env.production .env && npm run dev'
```

Usage:
- `lmdev` - Start local development environment
- `lmprod` - Connect to production (careful!)

### Option B: Use dotenv-flow (Automatic)

```bash
npm install dotenv-flow
```

Then modify server startup to load correct env:

```javascript
// In server/index.js top
require('dotenv-flow').config();
```

---

## Step 4: Sync Database Schema

### Export Current Schema from Production

Go to Supabase Dashboard → SQL Editor → New Query:

```sql
-- Export schema (run this in Supabase SQL Editor)
-- Copy the output and save to migrations/000_schema.sql
```

Or use pg_dump:
```bash
# Install pg_dump if needed
# Export schema only (no data)
pg_dump --schema-only --no-owner \
  postgres://postgres:[YOUR-DB-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres \
  > migrations/000_schema.sql
```

### Apply Schema to Local Database

```bash
# Reset local database with schema
supabase db reset

# Or apply specific migration
psql postgresql://postgres:postgres@localhost:54322/postgres < migrations/000_schema.sql
```

---

## Step 5: Seed Test Data (Optional)

Create `migrations/001_seed_test_data.sql`:

```sql
-- Test users
INSERT INTO users (email, password, name, role, is_active) 
VALUES ('test@example.com', 'hashedpassword', 'Test Admin', 'superadmin', true);

-- Test drivers
INSERT INTO drivers (name, phone, license_number) 
VALUES ('John Test', '0700000000', 'TEST001');
```

Apply:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres < migrations/001_seed_test_data.sql
```

---

## Step 6: Update Server to Use Environment Variables

The server currently has hardcoded Supabase credentials. Let's fix that:

```bash
# Install dotenv
npm install dotenv
```

Update server to load from env:

```javascript
// server/supabase-client.js
require('dotenv').config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## Step 7: Workflow Summary

### Daily Development Workflow

```bash
# 1. Start development environment
lmdev

# 2. Make changes, test freely
# (Your local database is isolated)

# 3. Create migrations for schema changes
supabase db diff -f add_new_feature

# 4. Test migration
supabase db reset

# 5. Commit and push (deploys to production)
git add .
git commit -m "Add new feature"
git push
```

### Pushing to Production

Before pushing, you MUST:

1. **Apply migrations to production** (if you changed schema)
   - Go to Supabase Dashboard → SQL Editor
   - Run the migration SQL

2. **Test critical paths** locally

3. **Push to deploy**
   ```bash
   git push
   ```

---

## Important Rules

### ✅ DO:
- Test everything locally first
- Create migrations for schema changes
- Keep `.env.production` secure (never commit it)
- Use separate test data locally

### ❌ DON'T:
- Test new features directly on production
- Share your production `.env` file
- Commit production credentials to git
- Run `supabase db reset` on production!

---

## Troubleshooting

### Local Supabase Won't Start
```bash
# Stop everything and restart
docker-compose down
supabase stop
supabase start
```

### Need to Reset Local Database
```bash
# WARNING: This deletes all local data!
supabase db reset
```

### Sync Production Data to Local (for debugging)
```bash
# Export production data (be careful with sensitive data!)
pg_dump --data-only --no-owner \
  postgres://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres \
  > backup.sql

# Import to local
psql postgresql://postgres:postgres@localhost:54322/postgres < backup.sql
```

---

## Cost Analysis

| Approach | Cost | Pros | Cons |
|----------|------|------|------|
| **Supabase CLI (Local)** | FREE | Full isolation, fast, offline capable | Requires Docker |
| **2nd Free Supabase Project** | FREE | Cloud-like environment | Limited to 500MB, still network dependent |
| **Supabase Pro (2nd project)** | $25/mo | Full features, isolated | Costs money |

**Recommendation:** Use Supabase CLI locally (FREE).

---

## Next Steps

1. Install Supabase CLI
2. Run `supabase init` and `supabase start`
3. Update your server to use env variables
4. Export current schema to migrations
5. Test the setup

Want me to help with any of these steps?
