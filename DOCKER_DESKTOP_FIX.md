# Fix Docker Desktop File Sharing for Supabase

## The Exact Fix

You need to add the path to Docker Desktop's File Sharing settings.

### Step 1: Open Docker Desktop Settings

1. Open Docker Desktop application
2. Click the **Settings** (gear icon) in top right
3. Go to **Resources** → **File Sharing**

### Step 2: Add Required Paths

Click the "+" button and add these paths one by one:

```
/home/munyao
/home/munyao/.docker
/home/munyao/Documents/react_projects/land-mawe-app
/socket_mnt
```

Or simply add the parent directory:
```
/home
```

### Step 3: Apply & Restart

1. Click **"Apply & Restart"**
2. Wait for Docker to restart (30-60 seconds)

### Step 4: Try Again

```bash
supabase start
```

---

## Alternative: Use Docker Without Desktop

If Docker Desktop keeps failing, use the system Docker service:

```bash
# Stop Docker Desktop
# Start system Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (so you don't need sudo)
sudo usermod -aG docker $USER

# IMPORTANT: Log out completely and log back in
# Then test:
docker ps
supabase start
```

---

## Alternative: Fix via Docker Desktop CLI

```bash
# Add to Docker Desktop file sharing via settings.json
# Edit Docker Desktop settings
cat ~/.docker/desktop/settings.json | grep filesharing

# If it exists, add your home directory to the list
```

---

## Quick Check

After fixing, verify Docker works:

```bash
# Should show running containers (empty list is OK)
docker ps

# Should show Docker info
docker info

# Then try Supabase
supabase start
```

---

## Nuclear Option: Reset Docker Desktop

If nothing works:

```bash
# WARNING: This removes all Docker data!
# Export any important containers/images first

# Reset Docker Desktop
rm -rf ~/.docker/desktop

# Restart Docker Desktop
# Re-add file sharing paths
# Try supabase start again
```
