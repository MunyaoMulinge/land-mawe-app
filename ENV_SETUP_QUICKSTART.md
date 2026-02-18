# 🚀 Dev/Prod Separation - Quick Start

## The Problem
Currently, your dev and prod share the same database. When you test locally, it affects live clients.

## The Solution
Use **Supabase CLI** to run a local Postgres database (FREE) for development.

---

## 📋 Setup Checklist (One-time)

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Initialize Local Database
```bash
cd /home/munyao/Documents/react_projects/land-mawe-app
supabase init
supabase start
```

Wait 2-3 minutes. You'll see:
```
API URL: http://localhost:54321
Studio URL: http://localhost:54323  ← GUI to manage local DB
```

### 3. Export Your Current Schema
Go to Supabase Dashboard → SQL Editor → Run:

```bash
# Or use this command (requires your DB password)
pg_dump --schema-only --no-owner \
  postgres://postgres:[PASSWORD]@db.fipbfnjzaamjayzqvlvg.supabase.co:5432/postgres \
  > migrations/000_schema.sql
```

Then import to local:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres < migrations/000_schema.sql
```

---

## 🔄 Daily Workflow

### Start Development (Local)
```bash
# Option 1: Use the script
./scripts/switch-env.sh dev

# Option 2: Manual
supabase start
cp .env.development .env
npm run dev
```

### Switch to Production (Careful!)
```bash
# Option 1: Use the script (with confirmation)
./scripts/switch-env.sh prod

# Option 2: Manual
supabase stop
cp .env.production .env
npm run dev
```

---

## 📁 File Structure

```
.env                    ← Active config (switches between dev/prod)
.env.development        ← Local Supabase credentials
.env.production         ← Cloud Supabase credentials (LIVE)
scripts/switch-env.sh   ← Helper script to switch environments
```

---

## ✅ Safe Development Rules

| What | Local (Dev) | Production |
|------|-------------|------------|
| **Test new features** | ✅ Yes | ❌ Never |
| **Delete test data** | ✅ Yes | ❌ Never |
| **Modify schema** | ✅ Yes | ⚠️ Only via migrations |
| **Real client data** | ❌ No | ✅ Yes |

---

## 🚨 Before Pushing to Production

1. **Test locally first** - Make sure everything works
2. **Apply schema migrations** to production (if you changed database)
3. **Commit and push** - Vercel will auto-deploy

```bash
# If you changed database schema
# 1. Run in Supabase Dashboard SQL Editor (production):
#    - Your migration SQL

# 2. Deploy code
git add .
git commit -m "Your feature"
git push
```

---

## 💰 Cost

| Component | Cost |
|-----------|------|
| Local Supabase (CLI) | **FREE** |
| Production Supabase | Current plan (free tier?) |
| **Total** | **No extra cost** |

---

## 🆘 Troubleshooting

### "supabase command not found"
```bash
npm install -g supabase
```

### "Docker not running"
Supabase CLI requires Docker Desktop to be running.

### "Port already in use"
```bash
supabase stop
supabase start
```

### "Database connection failed"
```bash
# Reset local database (deletes all local data!)
supabase db reset
```

---

## 🎯 Next Steps

1. Install Supabase CLI: `npm install -g supabase`
2. Run: `supabase init && supabase start`
3. Export your schema to local
4. Test: `./scripts/switch-env.sh dev`
5. Start coding safely!

Need help with any step?
