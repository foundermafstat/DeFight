# Deployment Guide for Ubuntu 24

This guide assumes you have root or sudo access to an Ubuntu 24 server and the domain `defight.aima.studio` points to the server's IP.

## 1. Install Prerequisites

Update the system and install Node.js (via NVM recommended), NPM, PM2, and Nginx.

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y

# Install Node.js (using NVM)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v # Should be v20.x.x

# Install PM2 globally
npm install -g pm2
```

## 2. Setup Project

Clone your repository or upload the files to `/var/www/defight` (or your preferred directory).

```bash
mkdir -p /var/www/defight
# (Upload files here)
cd /var/www/defight
```

## 3. Install Dependencies & Build

```bash
# Install root dependencies
npm install

# Build the project (Client, Server, Engine, SDK)
npm run build
```

## 4. Configuration

### Environment Variables

Create `.env` files in the necessary directories.

**Root `.env`**:

```bash
cp .env.example .env
nano .env
# Fill in:
# OPENAI_API_KEY=...
# SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

**GameMaster `.env`** (packages/gamemaster/.env):

```bash
cp packages/gamemaster/.env.example packages/gamemaster/.env
nano packages/gamemaster/.env
# Fill in:
# ORACLE_PRIVATE_KEY=...
# BSC_TESTNET_RPC=...
```

### Nginx Setup

Copy the generated `nginx.conf` to the Nginx sites-available directory.

```bash
sudo cp nginx.conf /etc/nginx/sites-available/defaibattles
sudo ln -s /etc/nginx/sites-available/defaibattles /etc/nginx/sites-enabled/
sudo nginx -t # Test configuration
sudo systemctl restart nginx
```

### SSL (HTTPS)

Use Certbot to get a free SSL certificate.

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d defaibattles.aima.studio
```

## 5. Start Application with PM2

Start the client and server using the ecosystem file.

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 6. Verification

- Open `https://defight.aima.studio` in your browser.
- Check if the page loads (Client).
- Check browser console for WebSocket connection logic (Server).
- Check logs if issues arise: `pm2 logs`.
