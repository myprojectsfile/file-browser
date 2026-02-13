# File Browser Backend

## Setup
1. Copy `.env.example` to `.env`
2. Set `ROOT_DIRECTORY` to the folder you want to expose
3. Optionally set `PORT` and `CORS_ORIGIN` for production
4. Run `npm install`
5. Run `npm start` for production or `npm run dev` for development

Example:
```bash
cp .env.example .env
# edit .env and set ROOT_DIRECTORY to a real directory
npm install
npm start
```

## Security Notes
- `ROOT_DIRECTORY` should be a dedicated directory, not `/`.
- Run the service as a non-root user.
- If you place this behind Nginx, only expose port 4000 internally.

## API
- `GET /api/files/*` - List directory contents
- `GET /api/download/*` - Download file with resume support
- Paths are constrained to `ROOT_DIRECTORY`, including symlink resolution.
