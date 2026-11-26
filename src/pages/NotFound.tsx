import React from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../components/common/Seo';

/**
 * Replaces `<Route path="*" element={<Navigate to="/" replace />} />`.
 * Redirecting every unknown URL to "/" creates soft 404s (Google sees many URLs with home-page content).
 * Pair with the server fallback in server/seo.ts, which returns a real 404 status for unknown paths.
 */
export const NotFound: React.FC = () => (
  <main
    id="main-content"
    className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F7F9FB] dark:bg-[#070B13] text-[#17263F] dark:text-[#E2E8F0] px-6 text-center"
  >
    <Seo title="Page not found — AquaWatt" description="This page does not exist." noindex />
    <p className="text-xs font-mono text-slate-500">404</p>
    <h1 className="text-3xl font-extrabold font-heading">Page not found</h1>
    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
      The page you are looking for does not exist or has moved.
    </p>
    <Link
      to="/"
      className="px-4 py-2 rounded-lg bg-[#174A8B] text-white text-xs font-semibold hover:bg-[#123A6F] transition-colors"
    >
      Back to AquaWatt
    </Link>
  </main>
);

export default NotFound;
