import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const options = {
  root: fileURLToPath(new URL('../dist', import.meta.url)),
  port: 4173,
};

try {
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const [flag, supplied] = args[index].split(/=(.*)/s);
    if (flag === '--help' || flag === '-h') {
      console.log('Usage: node scripts/serve.mjs [--root directory] [--port 4173]');
      process.exit(0);
    }
    if (flag !== '--root' && flag !== '--port') throw new Error(`Unknown option: ${flag}`);
    const value = supplied ?? args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (flag === '--root') options.root = path.resolve(value);
    else {
      if (!/^\d+$/.test(value) || Number(value) > 65535) throw new Error('Port must be an integer from 0 to 65535.');
      options.port = Number(value);
    }
  }
  options.root = await realpath(options.root);
  if (!(await stat(options.root)).isDirectory()) throw new Error('The server root must be a directory.');
} catch (error) {
  console.error(`Cannot start preview: ${error.message}`);
  process.exit(1);
}

const types = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}));

function withinRoot(filename) {
  const relative = path.relative(options.root, filename);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function reply(request, response, status, message, extra = {}) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    ...extra,
  });
  response.end(request.method === 'HEAD' ? undefined : `${message}\n`);
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    reply(request, response, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
    return;
  }

  try {
    // Decode before resolving so encoded traversal is rejected as well.
    const rawPath = (request.url || '/').split('?')[0];
    let pathname;
    try {
      pathname = decodeURIComponent(rawPath).replaceAll('\\', '/');
    } catch {
      reply(request, response, 400, 'Malformed URL');
      return;
    }
    if (!pathname.startsWith('/') || pathname.includes('\0')) {
      reply(request, response, 400, 'Invalid URL');
      return;
    }
    if (pathname.split('/').includes('..')) {
      reply(request, response, 403, 'Forbidden');
      return;
    }

    let filename = path.resolve(options.root, `.${pathname}`);
    if (!withinRoot(filename)) {
      reply(request, response, 403, 'Forbidden');
      return;
    }
    let info = await stat(filename);
    if (info.isDirectory()) {
      if (!pathname.endsWith('/')) {
        const query = (request.url || '').slice(rawPath.length);
        reply(request, response, 308, 'Redirecting', { Location: `${rawPath}/${query}` });
        return;
      }
      filename = path.join(filename, 'index.html');
      info = await stat(filename);
    }

    // Files and directory indexes must remain inside the root after symlinks.
    filename = await realpath(filename);
    if (!withinRoot(filename)) {
      reply(request, response, 403, 'Forbidden');
      return;
    }
    if (!info.isFile()) {
      reply(request, response, 404, 'Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': types.get(path.extname(filename).toLowerCase()) || 'application/octet-stream',
      'Content-Length': info.size,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    });
    if (request.method === 'HEAD') response.end();
    else {
      const stream = createReadStream(filename);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    }
  } catch (error) {
    const status = ['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) ? 404 : error.code === 'EACCES' ? 403 : 500;
    if (!response.headersSent) reply(request, response, status, status === 404 ? 'Not found' : status === 403 ? 'Forbidden' : 'Server error');
    else response.destroy();
  }
});

server.on('error', (error) => {
  console.error(`Cannot start preview: ${error.message}`);
  process.exitCode = 1;
});
server.listen(options.port, '127.0.0.1', () => {
  console.log(`Local: http://127.0.0.1:${server.address().port}/`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
