/// <reference types="node" />
import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function sanitizeSupabaseUrl(url: string): string {
  const cleaned = url.trim().replace(/^['"]|['"]$/g, '');
  if (!cleaned) return '';
  try {
    const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
    return new URL(withProtocol).origin;
  } catch {
    return cleaned
      .replace(/\/(rest|auth|storage|realtime|functions)\/v\d+\/?.*$/i, '')
      .replace(/\/+$/, '');
  }
}

const SUPABASE_BASE_URL = sanitizeSupabaseUrl(
  process.env.VITE_SUPABASE_URL || 'https://sgthvugjhmjnluqvzhqt.supabase.co'
);

const SKIPPED_REQ_HEADERS = new Set([
  'host',
  'origin',
  'referer',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-length',
  'accept-encoding',
  'cookie',
  'upgrade-insecure-requests',
]);

const SKIPPED_RES_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'set-cookie',
]);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // Same-origin proxy fallback for Supabase Auth & REST when browser direct fetch fails
  app.use('/api/supabase', express.raw({ type: '*/*', limit: '10mb' }), async (req: Request, res: Response) => {
    try {
      const targetUrl = `${SUPABASE_BASE_URL}${req.url}`;
      const forwardHeaders: Record<string, string> = {};

      for (const [key, value] of Object.entries(req.headers)) {
        const lower = key.toLowerCase();
        if (SKIPPED_REQ_HEADERS.has(lower) || lower.startsWith('sec-') || lower.startsWith('x-forwarded-')) {
          continue;
        }
        if (typeof value === 'string') {
          forwardHeaders[key] = value;
        } else if (Array.isArray(value) && value.length > 0) {
          forwardHeaders[key] = value.join(', ');
        }
      }

      const method = req.method.toUpperCase();
      const hasBody = method !== 'GET' && method !== 'HEAD';
      const body =
        hasBody && Buffer.isBuffer(req.body) && req.body.length > 0
          ? new Uint8Array(req.body)
          : undefined;

      const upstream = await fetch(targetUrl, {
        method,
        headers: forwardHeaders,
        body,
      });

      res.status(upstream.status);
      res.setHeader('x-pitstop-proxy', '1');

      upstream.headers.forEach((value, key) => {
        if (!SKIPPED_RES_HEADERS.has(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      const payload = Buffer.from(await upstream.arrayBuffer());
      res.send(payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido ao conectar ao Supabase';
      res.status(502).setHeader('x-pitstop-proxy', '1').json({
        error: 'proxy_upstream_error',
        message: msg,
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(currentDir, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PitStop server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start PitStop server:', err);
  process.exit(1);
});
