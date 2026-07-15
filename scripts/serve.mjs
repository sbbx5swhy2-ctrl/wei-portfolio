import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(scriptDir, '..', 'dist');
const basePath = `/${(process.env.SITE_BASE_PATH || '/wei-portfolio/').split('/').filter(Boolean).join('/')}/`;
const port = Number(process.env.PORT || 4173);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (!requestUrl.pathname.startsWith(basePath)) {
      response.writeHead(302, { Location: basePath });
      response.end();
      return;
    }

    let relative = decodeURIComponent(requestUrl.pathname.slice(basePath.length));
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const candidate = path.resolve(distDir, relative);
    if (!candidate.startsWith(`${distDir}${path.sep}`) && candidate !== path.join(distDir, 'index.html')) {
      throw new Error('Unsafe path');
    }

    let filePath = candidate;
    try {
      const info = await stat(filePath);
      if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
    } catch {
      filePath = path.join(distDir, '404.html');
      response.statusCode = 404;
    }

    const body = await readFile(filePath);
    response.setHeader('Content-Type', types[path.extname(filePath)] || 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    response.end(body);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Server error');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Preview: http://127.0.0.1:${port}${basePath}`);
});
