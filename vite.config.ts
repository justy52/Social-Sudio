import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { config } from 'dotenv';
import { defineConfig, type ViteDevServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: '.env.local', override: false, quiet: true });
config({ path: '.env', override: false, quiet: true });

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

function localApiPlugin() {
  return {
    name: 'social-studio-local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url ?? '/', 'http://localhost');

        if (!requestUrl.pathname.startsWith('/api/')) {
          return next();
        }

        try {
          const route = await resolveApiRoute(server, requestUrl.pathname);

          if (!route) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }

          const query = Object.fromEntries(requestUrl.searchParams.entries());
          if (route.params) {
            Object.assign(query, route.params);
          }

          const request = req as IncomingMessage & {
            body?: unknown;
            query: Record<string, string>;
          };
          request.query = query;

          if (req.method && !['GET', 'HEAD'].includes(req.method) && route.parseBody) {
            request.body = await readRequestBody(req);
          }

          await route.handler(request, createVercelLikeResponse(res));
        } catch (error) {
          server.ssrFixStacktrace(error as Error);
          next(error);
        }
      });
    },
  };
}

async function resolveApiRoute(server: ViteDevServer, pathname: string) {
  if (pathname === '/api/businesses') {
    const module = await server.ssrLoadModule('/api/businesses/index.ts');
    return { handler: module.default, parseBody: true };
  }

  if (pathname === '/api/posts') {
    const module = await server.ssrLoadModule('/api/posts/index.ts');
    return { handler: module.default, parseBody: true };
  }

  if (pathname === '/api/media/upload') {
    const module = await server.ssrLoadModule('/api/media/upload.ts');
    return { handler: module.default, parseBody: true };
  }

  const businessMatch = pathname.match(/^\/api\/businesses\/([^/]+)$/);
  if (businessMatch) {
    const module = await server.ssrLoadModule('/api/businesses/[id].ts');
    return {
      handler: module.default,
      params: { id: decodeURIComponent(businessMatch[1]) },
      parseBody: true,
    };
  }

  const postMatch = pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (postMatch) {
    const module = await server.ssrLoadModule('/api/posts/[id].ts');
    return {
      handler: module.default,
      params: { id: decodeURIComponent(postMatch[1]) },
      parseBody: true,
    };
  }

  const mediaMatch = pathname.match(/^\/api\/media\/(.+)$/);
  if (mediaMatch) {
    const module = await server.ssrLoadModule('/api/media/[key].ts');
    return {
      handler: module.default,
      params: { key: decodeURIComponent(mediaMatch[1]) },
      parseBody: true,
    };
  }

  if (pathname === '/api/webhooks/clerk') {
    const module = await server.ssrLoadModule('/api/webhooks/clerk.ts');
    return { handler: module.default, parseBody: false };
  }

  return null;
}

function createVercelLikeResponse(res: ServerResponse) {
  const response = res as ServerResponse & {
    status: (statusCode: number) => typeof response;
    json: (payload: unknown) => typeof response;
  };

  response.status = (statusCode: number) => {
    res.statusCode = statusCode;
    return response;
  };

  response.json = (payload: unknown) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify(payload));
    return response;
  };

  return response;
}

async function readRequestBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (!rawBody) {
    return {};
  }

  const contentType = req.headers['content-type'] ?? '';
  if (Array.isArray(contentType) ? contentType.includes('application/json') : contentType.includes('application/json')) {
    return JSON.parse(rawBody);
  }

  return Buffer.concat(chunks);
}
