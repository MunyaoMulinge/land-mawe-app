# Installing Supabase CLI (Working Methods)

The npm global install doesn't work. Here are the supported methods:

## Method 1: Install via Script (Linux/Mac) ⭐ RECOMMENDED

```bash
# Download and install
curl -fsSL https://github.com/supabase/supabase/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C /tmp
sudo mv /tmp/supabase /usr/local/bin/
supabase --version
```

## Method 2: Using Homebrew (Mac)

```bash
brew install supabase/tap/supabase
```

## Method 3: Using apt (Ubuntu/Debian)

```bash
# Add Supabase repository
sudo apt-get update
sudo apt-get install -y curl

# Install
sudo curl -fsSL https://github.com/supabase/supabase/releases/latest/download/supabase_linux_amd64.deb -o /tmp/supabase.deb
sudo dpkg -i /tmp/supabase.deb

# Verify
supabase --version
```

## Method 4: Download Manually

1. Go to: https://github.com/supabase/supabase/releases/latest
2. Download `supabase_linux_amd64.tar.gz` (or your platform)
3. Extract and move to PATH:

```bash
tar -xzf supabase_linux_amd64.tar.gz
sudo mv supabase /usr/local/bin/
supabase --version
```

---

## After Installation

Once installed, run:

```bash
# Initialize in your project
cd /home/munyao/Documents/react_projects/land-mawe-app
supabase init

# Start local database
supabase start
```

You'll see output like:
```
Started supabase local development setup.

API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
Inbucket URL: http://localhost:54324
```

---

## Troubleshooting

### "Permission denied"
```bash
sudo chmod +x /usr/local/bin/supabase
```

### "supabase: command not found"
```bash
# Add to PATH
export PATH="$PATH:/usr/local/bin"

# Or add to ~/.bashrc for persistence
echo 'export PATH="$PATH:/usr/local/bin"' >> ~/.bashrc
source ~/.bashrc
```

### Docker Issues
Supabase CLI requires Docker. Make sure Docker is running:
```bash
docker ps
```
