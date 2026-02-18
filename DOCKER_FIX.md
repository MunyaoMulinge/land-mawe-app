# Fix Docker Permission Issues for Supabase

## Problem
Docker Desktop on Linux needs file sharing permissions for the project directory.

## Solution 1: Add Project Directory to Docker File Sharing

1. Open Docker Desktop
2. Go to Settings (gear icon) → Resources → File Sharing
3. Add these paths:
   - `/home/munyao/Documents/react_projects`
   - Or specifically: `/home/munyao/Documents/react_projects/land-mawe-app`
4. Click "Apply & Restart"

## Solution 2: Use Docker Engine Directly (Without Desktop)

If Docker Desktop continues to have issues, use the Docker daemon directly:

```bash
# Stop Docker Desktop
# Use system Docker instead
sudo systemctl start docker
sudo usermod -aG docker $USER

# Log out and log back in, then:
supabase start
```

## Solution 3: Run Supabase with Sudo

```bash
# This gives Docker the permissions it needs
sudo supabase start
```

⚠️ Note: Running with sudo may create files owned by root. To fix later:
```bash
sudo chown -R $USER:$USER /home/munyao/Documents/react_projects/land-mawe-app/supabase
```

## Solution 4: Reset Docker Desktop File Sharing

```bash
# Reset Docker Desktop settings
rm -rf ~/.docker/desktop
# Then restart Docker Desktop and re-add file shares
```

## Quick Test

After applying any solution, test Docker:

```bash
docker run hello-world
```

If that works, try Supabase again:

```bash
supabase start
```

---

## Alternative: Skip Local Database for Now

If Docker issues persist, you can:

1. Create a **free second Supabase project** for testing
2. Or continue using production but be extra careful

### Create Test Project (Free)

1. Go to https://supabase.com
2. Create new project (free tier gives 500MB)
3. Copy the new project URL and keys
4. Create `.env.test`:

```bash
SUPABASE_URL=https://new-project-ref.supabase.co
SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-new-service-key
VITE_API_BASE=http://localhost:3001/api
```

5. Use it: `cp .env.test .env && npm run dev`

This costs nothing and avoids Docker issues.
