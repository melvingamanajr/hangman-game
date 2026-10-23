import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };

export function createStaticServer() {
    return createServer(async (request, response) => {
        try {
            const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
            const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
            const inside = relative(root, path);
            if (inside.startsWith('..') || isAbsolute(inside)) {
                response.writeHead(403).end();
                return;
            }
            const content = await readFile(path);
            response.writeHead(200, { 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}; charset=utf-8`,
                'Cache-Control': 'no-store' });
            response.end(content);
        } catch {
            response.writeHead(404).end('Not found');
        }
    });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const port = Number(process.env.PORT) || 4173;
    const server = createStaticServer();
    server.on('error', error => { console.error(error.message); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(`Hangman: http://127.0.0.1:${port}`));
}
