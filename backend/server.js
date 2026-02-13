const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const mime = require('mime-types');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
if (!process.env.ROOT_DIRECTORY) {
  throw new Error('ROOT_DIRECTORY is required. Set it in backend/.env.');
}

const ROOT_DIRECTORY = path.resolve(process.env.ROOT_DIRECTORY);
const ROOT_REALPATH = fs.realpathSync(ROOT_DIRECTORY);

if (!fs.statSync(ROOT_REALPATH).isDirectory()) {
  throw new Error(`ROOT_DIRECTORY must be a directory: ${ROOT_REALPATH}`);
}

if (!IS_PRODUCTION) {
  app.use(cors());
} else if (process.env.CORS_ORIGIN) {
  const allowedOrigins = process.env.CORS_ORIGIN
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(cors({ origin: allowedOrigins }));
}

app.use(express.json());

// Serve static files from React build in production
if (IS_PRODUCTION) {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

const normalizeRequestPath = (requestPath = '') => {
  return requestPath.replace(/\\/g, '/').replace(/^\/+/, '');
};

const ensurePathInsideRoot = async (targetPath) => {
  const targetRealPath = await fs.promises.realpath(targetPath);
  const relativeToRoot = path.relative(ROOT_REALPATH, targetRealPath);
  const outsideRoot = relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot);
  if (outsideRoot) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }
  return targetRealPath;
};

const toRelativePosixPath = (baseRequestPath, entryName) => {
  return path.posix.join(baseRequestPath, entryName);
};

// Get directory contents
app.get('/api/files/*', async (req, res) => {
  try {
    const requestPath = normalizeRequestPath(req.params[0] || '');
    const requestedFullPath = path.resolve(ROOT_REALPATH, requestPath);
    const fullPath = await ensurePathInsideRoot(requestedFullPath);
    const stats = await fs.promises.stat(fullPath);

    if (stats.isDirectory()) {
      const files = await fs.promises.readdir(fullPath, { withFileTypes: true });
      const rawItems = await Promise.all(
        files.map(async (entry) => {
          try {
            const filePath = path.join(fullPath, entry.name);
            const fileRealPath = await ensurePathInsideRoot(filePath);
            const fileStats = await fs.promises.stat(fileRealPath);
            const relativePath = toRelativePosixPath(requestPath, entry.name);

            return {
              name: entry.name,
              path: relativePath,
              isDirectory: fileStats.isDirectory(),
              size: fileStats.size,
              modifiedTime: fileStats.mtime,
              extension: path.extname(entry.name).toLowerCase()
            };
          } catch (entryError) {
            if (entryError.statusCode === 403 || entryError.code === 'ENOENT') {
              return null;
            }
            throw entryError;
          }
        })
      );
      const items = rawItems.filter(Boolean);

      // Sort: directories first, then files alphabetically
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      res.json({
        currentPath: requestPath || '/',
        parentPath: requestPath.split('/').slice(0, -1).join('/'),
        items
      });
    } else {
      res.json({ 
        isFile: true,
        path: requestPath,
        name: path.basename(fullPath)
      });
    }
  } catch (error) {
    if (error.statusCode === 403) {
      res.status(403).json({ error: 'Access denied' });
    } else if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Path not found' });
    } else {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Download file with resume support
app.get('/api/download/*', async (req, res) => {
  try {
    const filePath = normalizeRequestPath(req.params[0] || '');
    const requestedFullPath = path.resolve(ROOT_REALPATH, filePath);
    const fullPath = await ensurePathInsideRoot(requestedFullPath);
    const stats = await fs.promises.stat(fullPath);

    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot download directory' });
    }

    const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
    const fileName = path.basename(fullPath);
    
    // Handle range requests for resume support
    const range = req.headers.range;
    
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        return res.status(416).set('Content-Range', `bytes */${stats.size}`).end();
      }

      let start = match[1] ? parseInt(match[1], 10) : 0;
      let end = match[2] ? parseInt(match[2], 10) : stats.size - 1;

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stats.size) {
        return res.status(416).set('Content-Range', `bytes */${stats.size}`).end();
      }

      if (end >= stats.size) {
        end = stats.size - 1;
      }

      const chunkSize = end - start + 1;
      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
      });

      const stream = fs.createReadStream(fullPath, { start, end });
      stream.on('error', (streamError) => {
        console.error('Download stream error:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error downloading file' });
        } else {
          res.destroy(streamError);
        }
      });
      stream.pipe(res);
    } else {
      res.status(200).set({
        'Content-Length': stats.size,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
      });

      const stream = fs.createReadStream(fullPath);
      stream.on('error', (streamError) => {
        console.error('Download stream error:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error downloading file' });
        } else {
          res.destroy(streamError);
        }
      });
      stream.pipe(res);
    }
  } catch (error) {
    if (error.statusCode === 403) {
      res.status(403).json({ error: 'Access denied' });
    } else if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' });
    } else {
      console.error('Download error:', error);
      res.status(500).json({ error: 'Error downloading file' });
    }
  }
});

// Serve React app in production
if (IS_PRODUCTION) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`File browser server running on port ${PORT}`);
  console.log(`Serving directory: ${ROOT_REALPATH}`);
});
