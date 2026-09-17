import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3000;
const BUILD_DIR = path.resolve('frontend/build');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const SERVICE_PORTS = {
  '/api/auth': 4000,
  '/api/user': 4000,
  '/api/restaurant': 5002,
  '/api/food-items': 5002,
  '/api/notifications': 5002,
  '/api/delivery': 5003,
  '/api/drivers': 5003,
  '/api/payment': 5004,
  '/api/order': 5005,
  '/api/orders': 5005,
};

function proxyRequest(req, res, targetPort) {
  const options = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
  };

  const proxy = http.request(options, (targetRes) => {
    res.writeHead(targetRes.statusCode, targetRes.headers);
    targetRes.pipe(res);
  });

  proxy.on('error', (err) => {
    console.error(`Proxy error to port ${targetPort}:`, err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Gateway', servicePort: targetPort, message: err.message }));
  });

  req.pipe(proxy);
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = parsedUrl.pathname;

  // Handle API proxies
  for (const [prefix, port] of Object.entries(SERVICE_PORTS)) {
    if (pathname.startsWith(prefix)) {
      return proxyRequest(req, res, port);
    }
  }

  // Handle Static Files
  let filePath = path.join(BUILD_DIR, pathname === '/' ? 'index.html' : pathname);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  // SPA Fallback: Serve index.html for client-side routes
  const indexPath = path.join(BUILD_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    return fs.createReadStream(indexPath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SkyDish Frontend Server running at http://localhost:${PORT}`);
  console.log(`Serving static files from: ${BUILD_DIR}`);
});
