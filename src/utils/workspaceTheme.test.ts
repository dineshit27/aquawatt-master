import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import {
  PALETTE_OPTIONS,
  VALID_PALETTES,
  resolveInitialAppearance,
  transitionPaletteState,
  transitionThemeState,
} from './workspaceTheme';
import { ThemeProvider } from '../context/ThemeContext';
import { AppProvider } from '../context/AppContext';
import { AppLayout } from '../components/layout/AppLayout';
import { WorkspaceControlsDrawer } from '../components/common/WorkspaceControlsDrawer';
import { FolioControlPanel } from '../components/business-analytics/FolioControlPanel';

describe('Workspace Controls — Surface Theme & Palette state invariants', () => {
  it('defaults to light / aquawatt when no preferences are saved', () => {
    const state = resolveInitialAppearance({});
    assert.deepEqual(state, {
      theme: 'light',
      palette: 'aquawatt',
      lastLightPalette: 'aquawatt',
    });
  });

  it('reconciles mismatched savedTheme=dark with savedPalette=forest to dark while remembering forest', () => {
    const state = resolveInitialAppearance({
      savedTheme: 'dark',
      savedPalette: 'forest',
    });
    assert.deepEqual(state, {
      theme: 'dark',
      palette: 'dark',
      lastLightPalette: 'forest',
    });
  });

  it('keeps theme and palette synchronized across all 6 palette transitions', () => {
    let state = resolveInitialAppearance({});

    for (const pal of ['swiss', 'ivory', 'forest', 'terracotta', 'aquawatt'] as const) {
      state = transitionPaletteState(state, pal);
      assert.equal(state.theme, 'light');
      assert.equal(state.palette, pal);
      assert.equal(state.lastLightPalette, pal);
    }

    // Switch to Night Slate palette -> theme becomes dark, lastLightPalette stays aquawatt
    state = transitionPaletteState(state, 'dark');
    assert.equal(state.theme, 'dark');
    assert.equal(state.palette, 'dark');
    assert.equal(state.lastLightPalette, 'aquawatt');

    // Selecting AquaWatt Swiss while in dark mode returns cleanly to light mode
    state = transitionPaletteState(state, 'aquawatt');
    assert.equal(state.theme, 'light');
    assert.equal(state.palette, 'aquawatt');
  });

  it('switches palette to dark when Dark theme is clicked from any light palette and restores it on Light', () => {
    let state = transitionPaletteState(resolveInitialAppearance({}), 'terracotta');
    assert.equal(state.palette, 'terracotta');

    // User clicks "Dark" toggle
    state = transitionThemeState(state, 'dark');
    assert.equal(state.theme, 'dark');
    assert.equal(state.palette, 'dark');
    assert.equal(state.lastLightPalette, 'terracotta');

    // User clicks "Light" toggle -> restores Terracotta Print cleanly
    state = transitionThemeState(state, 'light');
    assert.equal(state.theme, 'light');
    assert.equal(state.palette, 'terracotta');
  });

  it('defines CSS palette custom properties for every palette in index.css and business-analytics-folio.css', () => {
    const indexCss = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
    const folioCss = fs.readFileSync(
      path.resolve(process.cwd(), 'src/styles/business-analytics-folio.css'),
      'utf8'
    );

    for (const id of VALID_PALETTES) {
      if (id !== 'aquawatt') {
        assert.ok(
          indexCss.includes(`html[data-aw-palette="${id}"]`),
          `src/index.css missing html[data-aw-palette="${id}"]`
        );
        assert.ok(
          folioCss.includes(`[data-aw-folio-palette="${id}"]`),
          `business-analytics-folio.css missing [data-aw-folio-palette="${id}"]`
        );
      }
    }
    assert.ok(indexCss.includes('--aw-canvas:') && indexCss.includes('--aw-surface:'));
  });
});

describe('Workspace Controls UI — Cross-Page & Drawer Verification', () => {
  it('renders Controls button and full WorkspaceControlsDrawer on Dashboard, Analytics, Community, Pricing, and Contact routes', () => {
    const routes = ['/dashboard', '/analytics', '/community', '/subscription', '/contact'];

    for (const route of routes) {
      const html = renderToStaticMarkup(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(
            AppProvider,
            null,
            React.createElement(
              MemoryRouter,
              { initialEntries: [route] },
              React.createElement(AppLayout, {
                title: `Route ${route}`,
                children: React.createElement(
                  React.Fragment,
                  null,
                  React.createElement('div', null, `Body for ${route}`),
                  React.createElement(WorkspaceControlsDrawer, { isOpen: true, onClose: () => {} })
                ),
              })
            )
          )
        )
      );

      assert.ok(html.includes('aria-label="Open workspace controls"'), `${route} missing header Controls button`);
      assert.ok(html.includes('Telemetry Source Mode'), `${route} drawer missing Telemetry Source Mode`);
      assert.ok(html.includes('Default Reporting Window'), `${route} drawer missing Default Reporting Window`);
      assert.ok(html.includes('Surface Theme &amp; Palette'), `${route} drawer missing Surface Theme & Palette`);
      assert.ok(html.includes('12-Column Editorial Grid'), `${route} drawer missing 12-Column Editorial Grid`);

      for (const option of PALETTE_OPTIONS) {
        assert.ok(
          html.includes(option.label),
          `${route} WorkspaceControlsDrawer missing palette option ${option.label}`
        );
      }
    }
  });

  it('renders identical Surface Theme & Palette options in Business Analytics FolioControlPanel', () => {
    const html = renderToStaticMarkup(
      React.createElement(FolioControlPanel, {
        isOpen: true,
        onClose: () => {},
        sourceMode: 'hybrid',
        onSourceModeChange: () => {},
        reportingPeriod: '30d',
        onReportingPeriodChange: () => {},
        palette: 'forest',
        onPaletteChange: () => {},
        theme: 'light',
        onThemeChange: () => {},
        showGridOverlay: false,
        onToggleGridOverlay: () => {},
        onRefreshPhysical: () => {},
        isRefreshing: false,
        physicalRecordCount: 4,
      })
    );

    assert.ok(html.includes('Surface Theme &amp; Palette'));
    assert.ok(html.includes('Light') && html.includes('Dark'));
    for (const option of PALETTE_OPTIONS) {
      assert.ok(html.includes(option.label), `FolioControlPanel missing palette ${option.label}`);
    }
  });
});
