# Development Workflow

## Quick Reference

### Switch to Development (Local Database)
```bash
./scripts/switch-env.sh dev
```

### Switch to Production (Live Database)
```bash
./scripts/switch-env.sh prod
```

### Start Local Supabase (if not running)
```bash
supabase start
```

### Stop Local Supabase
```bash
supabase stop
```

### Reset Local Database
```bash
supabase db reset
./scripts/apply-all-migrations.sh
```

---

## Daily Development Flow

```bash
# 1. Start local environment
./scripts/switch-env.sh dev

# 2. Start backend
cd server && npm start

# 3. Start frontend (new terminal)
cd client && npm run dev

# 4. Open http://localhost:5173
# Login: munyaomulinge@protonmail.com / password123
```

---

## Before Pushing to Production

1. **Test locally** - Make sure everything works
2. **Apply schema changes** to production (if any)
3. **Commit and push**
   ```bash
   git add .
   git commit -m "Your feature"
   git push
   ```

---

## URLs

| Environment | Frontend | Backend | Database GUI |
|-------------|----------|---------|--------------|
| **Dev** | http://localhost:5173 | http://localhost:3001 | http://127.0.0.1:54323 |
| **Prod** | https://land-mawe-app.vercel.app | https://land-mawe-app.vercel.app/api | https://supabase.com/dashboard |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Can't login locally | Check local Supabase is running: `supabase status` |
| Port already in use | `supabase stop && supabase start` |
| Database out of sync | `supabase db reset && ./scripts/apply-all-migrations.sh` |
| Docker issues | See DOCKER_DESKTOP_FIX.md |
