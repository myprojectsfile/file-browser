# File Browser Web Application

A complete file browser with download manager support and resume capability.

## Quick Installation (Ubuntu VPS)

```bash
sudo apt update
sudo apt install -y nodejs npm

# Clone and install
git clone <your-repo-url> file-browser
cd file-browser
npm run install-all

# Configure backend
cp backend/.env.example backend/.env
nano backend/.env
# Set ROOT_DIRECTORY=/srv/file-browser/data (or your target path)

# Development mode
npm start

# Production build + run
npm run build
npm run prod
```

## Production Notes
- `ROOT_DIRECTORY` must point to a dedicated directory you intend to expose.
- Run the app as a non-root user.
- Prefer running behind Nginx and a process manager (`systemd` or `pm2`).
