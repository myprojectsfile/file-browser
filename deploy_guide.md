# File Browser Deployment Guide (Ubuntu)

This guide covers:
- Clone project from GitHub
- Install prerequisites
- Install all dependencies
- Run in development mode
- Run in production mode in background
- Stop/restart background process

Repository:
`git@github.com:myprojectsfile/file-browser.git`

## 1. Install Prerequisites

```bash
sudo apt update
sudo apt install -y git curl
```

Install Node.js LTS (20.x) and pnpm:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm pm2
```

Verify:

```bash
node -v
pnpm -v
pm2 -v
```

## 2. Clone the Project

If using SSH:

```bash
git clone git@github.com:myprojectsfile/file-browser.git
cd file-browser
```

If SSH key is not configured, use HTTPS:

```bash
git clone https://github.com/myprojectsfile/file-browser.git
cd file-browser
```

## 3. Install Project Dependencies

```bash
pnpm run install-all
```

## 4. Configure Environment

Create backend env file:

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Example `backend/.env`:

```env
PORT=4000
ROOT_DIRECTORY=/home/<your-user>/downloads
NODE_ENV=development
```

Notes:
- Use an absolute path for `ROOT_DIRECTORY`.
- Do not use `~` in `.env`.
- Avoid `/root/...` unless app runs as root (not recommended).

## 5. Run in Development Mode

From project root:

```bash
pnpm start
```

This runs:
- Backend on port `4000`
- Frontend on port `4001`

Stop dev mode:
- Press `Ctrl + C`

## 6. Run in Production Mode (Background)

Build frontend:

```bash
pnpm run build
```

Set production mode in backend env:

```bash
nano backend/.env
```

Set:

```env
NODE_ENV=production
```

Start in background with PM2:

```bash
pm2 start "pnpm run prod" --name file-browser
pm2 save
pm2 startup
```

Check status/logs:

```bash
pm2 status
pm2 logs file-browser
```

## 7. Stop / Restart Background Service

Stop:

```bash
pm2 stop file-browser
```

Start again:

```bash
pm2 start file-browser
```

Restart:

```bash
pm2 restart file-browser
```

Remove process from PM2:

```bash
pm2 delete file-browser
pm2 save
```

## 8. Update After New Git Push

```bash
cd file-browser
git pull
pnpm run install-all
pnpm run build
pm2 restart file-browser
```
