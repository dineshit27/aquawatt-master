import fs from 'fs';
import path from 'path';
import express, { type Express, type Request, type Response } from 'express';

const PUBLIC_SPA_ROUTES = new Set<string>(['/', '/contact']);

const PRIVATE_SPA_ROUTES = new Set<string>([
  '/login',
  '/signup',
  '/dashboard',
  '/analytics',
  '/business-analytics',
  '/community',
  '/subscription',
]);

const STATIC_EXTENSION_RE = /\.[a-z0-9]{1,8}$/i;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function normalizeRoutePath(reqPath: string): string {
  const clean = reqPath.replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

function resolvePublicBaseUrl(req: Request, explicitUrl?: string): string {
  if (explicitUrl && !explicitUrl.includes('%VITE_SITE_URL%')) {
    return normalizeBaseUrl(explicitUrl);
  }
  const envSiteUrl = process.env.VITE_SITE_URL?.trim();
  if (envSiteUrl && !envSiteUrl.includes('%VITE_SITE_URL%')) {
    return normalizeBaseUrl(envSiteUrl);
  }
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl && appUrl !== 'MY_APP_URL') {
    return normalizeBaseUrl(appUrl);
  }
  const host = req.get('host');
  if (host) {
    return `${req.protocol}://${host}`;
  }
  return '';
}

export function registerSeoRoutes(app: Express, publicUrl: string): void {
  const baseUrl = normalizeBaseUrl(publicUrl);

  app.get('/robots.txt', (_req: Request, res: Response) => {
    const body = [
      'User-agent: *',
      'Allow: /',
      'Allow: /contact',
      'Disallow: /login',
      'Disallow: /signup',
      'Disallow: /dashboard',
      'Disallow: /analytics',
      'Disallow: /business-analytics',
      'Disallow: /community',
      'Disallow: /subscription',
      'Disallow: /api/',
      'Disallow: /mcp',
      'Disallow: /.well-known/',
      '',
      `Sitemap: ${baseUrl}/sitemap.xml`,
      '',
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(body);
  });

  app.get('/sitemap.xml', (_req: Request, res: Response) => {
    const urls = [
      { loc: `${baseUrl}/`, changefreq: 'weekly', priority: '1.0' },
      { loc: `${baseUrl}/contact`, changefreq: 'monthly', priority: '0.7' },
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(
        u =>
          `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      ),
      '</urlset>',
      '',
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(xml);
  });
}

export function serveSpaWithSeo(app: Express, distPath: string, publicUrl?: string): void {
  const indexHtmlPath = path.join(distPath, 'index.html');
  let cachedIndexHtml: string | null = null;

  const getIndexHtml = (): string | null => {
    if (cachedIndexHtml !== null) return cachedIndexHtml;
    if (!fs.existsSync(indexHtmlPath)) return null;
    cachedIndexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
    return cachedIndexHtml;
  };

  app.use(express.static(distPath, { index: false }));

  app.get('*', (req: Request, res: Response) => {
    const routePath = normalizeRoutePath(req.path || '/');

    if (routePath.startsWith('/api/') || routePath === '/api') {
      res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'API endpoint not found.',
      });
      return;
    }

    if (STATIC_EXTENSION_RE.test(routePath)) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }

    const rawHtml = getIndexHtml();
    if (!rawHtml) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }

    const resolvedBase = resolvePublicBaseUrl(req, publicUrl);
    const html = rawHtml.includes('%VITE_SITE_URL%')
      ? rawHtml.replace(/%VITE_SITE_URL%/g, resolvedBase)
      : rawHtml;

    if (PUBLIC_SPA_ROUTES.has(routePath)) {
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).type('html').send(html);
      return;
    }

    if (PRIVATE_SPA_ROUTES.has(routePath)) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).type('html').send(html);
      return;
    }

    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).type('html').send(html);
  });
}
