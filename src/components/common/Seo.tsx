import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Per-route SEO tags.
 *
 * Updates the tags that already exist in index.html (instead of adding duplicates), so
 * each route gets its own title, description, canonical, robots and social tags.
 * Set VITE_SITE_URL (e.g. https://aquawatt.example) at build time.
 */
const SITE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SITE_URL as string | undefined)
    : undefined) ?? ''
).replace(/\/+$/, '');
const DEFAULT_IMAGE = '/og-image.png';

type Attr = 'name' | 'property';

function upsertMeta(attr: Attr, key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export interface SeoProps {
  title: string;
  description: string;
  /** Override the canonical path (defaults to the current pathname). */
  path?: string;
  /** Path or absolute URL of the social share image. */
  image?: string;
  /** Use for login, signup, dashboard and other private or thin pages. */
  noindex?: boolean;
}

export function Seo({ title, description, path, image = DEFAULT_IMAGE, noindex = false }: SeoProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    const base = SITE_URL || window.location.origin;
    const rawPath = path ?? pathname;
    const cleanPath = rawPath === '/' ? '/' : rawPath.replace(/\/+$/, '');
    const canonical = `${base}${cleanPath}`;
    const imageUrl = /^https?:\/\//.test(image) ? image : `${base}${image}`;

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta(
      'name',
      'robots',
      noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    );
    upsertCanonical(canonical);

    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);
  }, [title, description, path, pathname, image, noindex]);

  return null;
}

export default Seo;
