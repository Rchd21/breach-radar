// Mini serveur statique pour le développement local (aucune dépendance).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT) || 8080;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/rss+xml', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const file = join(PUBLIC, path || 'index.html');
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
  try {
    const body = await readFile(file.endsWith('\\') || file.endsWith('/') ? join(file, 'index.html') : file);
    res.writeHead(200, { 'Content-Type': `${TYPES[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache' }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => console.log(`Breach Radar : http://localhost:${PORT}`));
