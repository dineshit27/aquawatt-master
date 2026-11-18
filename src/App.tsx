/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import { ScrollToTop } from './components/common/ScrollToTop';
import { SmoothCursor } from './components/ui/smooth-cursor';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Community = lazy(() => import('./pages/Community').then(m => ({ default: m.Community })));
const Subscription = lazy(() => import('./pages/Subscription').then(m => ({ default: m.Subscription })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));

const RouteFallback = () => (
  <div
    className="min-h-screen flex items-center justify-center bg-[#F7F9FB] dark:bg-[#070B13] text-slate-600 dark:text-slate-300"
    role="status"
    aria-live="polite"
  >
    <div className="flex items-center gap-2.5 text-xs font-mono">
      <span className="w-2.5 h-2.5 rounded-full bg-[#174A8B] animate-pulse" />
      <span>Loading AquaWatt module...</span>
    </div>
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <SmoothCursor />
          <ScrollToTop />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/community" element={<Community />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}
