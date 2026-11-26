import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSimulatedSupportTicket,
  filterFaqs,
  validateContactForm,
  type ContactFormState,
} from './supportService.js';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  formatPlanPriceLabel,
  getPlanComparisonRows,
  getPlanPrice,
  resolvePlanActionLabel,
  SUBSCRIPTION_FAQ_CATEGORIES,
  SUBSCRIPTION_FAQ_DATA,
} from '../utils/subscriptionHelpers.js';
import { FAQ } from '../components/ui/faq-tabs.js';
import FluxPay from '../components/ui/fluxpay.js';
import { ContainerScroll } from '../components/ui/container-scroll-animation.js';
import { BrandLogo, AQUAWATT_LOGO_SRC } from '../components/common/BrandLogo.js';
import { SUBSCRIPTION_PLANS } from '../data/mockData.js';

describe('Support Service & Subscription Helpers', () => {
  it('validates contact inquiry form fields accurately', () => {
    const invalid: ContactFormState = {
      fullName: 'A',
      email: 'not-an-email',
      category: 'Hardware Setup',
      subject: 'Hi',
      message: 'Short',
    };

    const errors = validateContactForm(invalid);
    assert.ok(errors.fullName);
    assert.ok(errors.email);
    assert.ok(errors.subject);
    assert.ok(errors.message);

    const valid: ContactFormState = {
      fullName: 'Lab Operator',
      email: 'operator@example.com',
      category: 'Hardware Setup',
      subject: 'FS-S401 calibration question',
      message: 'Checking pulse factor configuration on GPIO34.',
    };
    assert.deepStrictEqual(validateContactForm(valid), {});
  });

  it('creates an explicitly labeled simulated support ticket without claiming live dispatch', () => {
    const ticket = createSimulatedSupportTicket(
      { fullName: 'Lab Operator', subject: 'GPIO34 Setup' },
      0.5
    );
    assert.strictEqual(ticket.isSimulation, true);
    assert.strictEqual(ticket.ticketId, 'AQW-55000');
    assert.ok(ticket.confirmationMessage.includes('local frontend simulation'));
    assert.ok(ticket.confirmationMessage.includes('Live email dispatch is not enabled'));
  });

  it('filters FAQ entries cleanly with trimmed case-insensitive search', () => {
    const sampleFaqs = [
      { question: 'How does FS-S401 connect?', answer: 'Connected to ESP32 GPIO34.' },
      { question: 'What about INA219?', answer: 'Pending hardware calibration.' },
    ];
    assert.strictEqual(filterFaqs(sampleFaqs, '   ').length, 2);
    assert.strictEqual(filterFaqs(sampleFaqs, 'gpio34').length, 1);
    assert.strictEqual(filterFaqs(sampleFaqs, 'nonexistent').length, 0);
  });

  it('computes billing cycle pricing labels, action labels, and comparison rows without fabricated SLA claims', () => {
    const proPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'standard');
    assert.ok(proPlan);

    assert.strictEqual(getPlanPrice(proPlan, 'monthly'), proPlan.priceMonthly);
    assert.strictEqual(getPlanPrice(proPlan, 'yearly'), proPlan.priceYearlyMonthlyEquivalent);

    const annualLabel = formatPlanPriceLabel(proPlan, 'yearly');
    assert.ok(annualLabel.includes('billed annually'));

    assert.strictEqual(resolvePlanActionLabel('free'), 'Downgrade to Starter');
    assert.strictEqual(resolvePlanActionLabel('standard'), 'Switch to Pro');
    assert.strictEqual(resolvePlanActionLabel('premium'), 'Upgrade to Enterprise');

    const rows = getPlanComparisonRows();
    assert.strictEqual(rows.length, 6);
    assert.ok(rows.every(r => !r.feature.toLowerCase().includes('sla')));
  });

  it('renders tabbed Subscription FAQ cleanly via SSR with AquaWatt-grounded categories', () => {
    const html = renderToString(
      React.createElement(FAQ, {
        title: 'Frequently Asked Questions',
        subtitle: 'Telemetry Plans, Hardware & Governance',
        categories: SUBSCRIPTION_FAQ_CATEGORIES,
        faqData: SUBSCRIPTION_FAQ_DATA,
      })
    );

    assert.ok(html.includes('role="tablist"'));
    assert.ok(html.includes('role="tabpanel"'));
    assert.ok(html.includes('Plans &amp; Billing'));
    assert.ok(html.includes('Hardware &amp; Sensors'));
    assert.ok(html.includes('Data &amp; Security'));
    assert.ok(html.includes('Starter Explorer'));
    assert.ok(!html.includes('Web Development'));
    assert.ok(!html.includes('Copywriting'));
  });

  it('renders FluxPay Subscription hero cleanly via SSR with AquaWatt-grounded metrics and tariff previews', () => {
    const html = renderToString(
      React.createElement(FluxPay, {
        brandName: 'AquaWatt',
        badge: 'Transparent Utility Telemetry Plans',
        titleLines: ['Predictable Plans for *Every*', '*Meter*, Built for What’s Next'],
        navItems: [
          { label: 'Plans', href: '#subscription-plans', active: true },
          { label: 'Matrix', href: '#capability-matrix' },
          { label: 'FAQ', href: '#subscription-faq' },
        ],
        primaryAction: { label: 'Explore Plans', href: '#subscription-plans' },
        secondaryAction: { label: 'Compare Matrix', href: '#capability-matrix' },
        stats: [
          { value: 3, label: 'telemetry plan tiers' },
          { value: 20, suffix: '%', label: 'annual billing savings' },
          { value: 365, suffix: 'd', label: 'Standard Pro retention' },
        ],
        transfers: [
          {
            route: 'Standard Pro · 12-Mo Annual',
            from: { code: 'MO', symbol: 'M', amount: 12, decimals: 0 },
            to: { code: 'INR', symbol: '₹', decimals: 0 },
            rate: 399,
            settled: 'Saves ₹1,200 / yr',
          },
        ],
        transferTitle: 'Tariff & Plan Preview',
        transferSteps: ['Metered', 'Rated', 'Projected'],
        sendLabel: 'Input',
        receiveLabel: 'Estimate',
      })
    );

    assert.ok(html.includes('data-slot="fluxpay"'));
    assert.ok(html.includes('AquaWatt'));
    assert.ok(html.includes('Transparent Utility Telemetry Plans'));
    assert.ok(html.includes('telemetry plan tiers'));
    assert.ok(html.includes('Tariff &amp; Plan Preview'));
    assert.ok(!html.includes('FluxPay'));
    assert.ok(!html.includes('Acme'));
    assert.ok(!html.includes('99.99%'));

    const noNavbarHtml = renderToString(
      React.createElement(FluxPay, {
        showNavbar: false,
        badge: 'Transparent Utility Telemetry Plans',
        titleLines: ['Predictable Plans for *Every*', '*Meter*, Built for What’s Next'],
      })
    );
    assert.ok(!noNavbarHtml.includes('class="fxp-header"'));
    assert.ok(noNavbarHtml.includes('Transparent Utility Telemetry Plans'));
  });

  it('renders ContainerScroll 3D scroll animation wrapper cleanly via SSR', () => {
    const html = renderToString(
      React.createElement(ContainerScroll, {
        titleComponent: React.createElement('h1', null, 'Every Drop. Every Watt.'),
        children: React.createElement('div', null, 'Telemetry Overview Showcase'),
      })
    );

    assert.ok(html.includes('perspective:1000px'));
    assert.ok(html.includes('Every Drop. Every Watt.'));
    assert.ok(html.includes('Telemetry Overview Showcase'));
  });

  it('renders BrandLogo with the AW Solutions logo asset and accessible attributes', () => {
    const html = renderToString(React.createElement(BrandLogo, { size: 'md' }));
    assert.ok(html.includes(AQUAWATT_LOGO_SRC));
    assert.ok(html.includes('AW Solutions — AquaWatt Logo'));

    const decorativeHtml = renderToString(
      React.createElement(BrandLogo, { size: 'sm', decorative: true })
    );
    assert.ok(decorativeHtml.includes('aria-hidden="true"'));
  });
});
