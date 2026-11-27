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
import { Footer } from '../components/navigation/Footer.js';
import ContactWithGlobe from '../components/ui/contact-with-globe.js';
import ScrollFAQAccordion from '../components/ui/scroll-faqaccordion.js';
import { HomeSectionBadge } from '../components/home/HomeSectionBadge.js';
import { MemoryRouter } from 'react-router-dom';
import { FAQ_ITEMS, SUBSCRIPTION_PLANS } from '../data/mockData.js';

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

  it('computes corrected pricing labels, action labels, and comparison rows without Unlimited or SLA claims', () => {
    const starterPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'free');
    const plusPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'standard');
    const businessPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'premium');
    assert.ok(starterPlan && plusPlan && businessPlan);

    assert.strictEqual(starterPlan.name, 'Starter Explorer');
    assert.strictEqual(getPlanPrice(starterPlan), 0);

    assert.strictEqual(plusPlan.name, 'AquaWatt Plus');
    assert.strictEqual(getPlanPrice(plusPlan), 149);
    assert.strictEqual(formatPlanPriceLabel(plusPlan), 'AquaWatt Plus (₹149/month)');

    assert.strictEqual(businessPlan.name, 'AquaWatt Business');
    assert.strictEqual(getPlanPrice(businessPlan), 499);
    assert.strictEqual(formatPlanPriceLabel(businessPlan), 'AquaWatt Business (Starting at ₹499/month)');

    assert.strictEqual(resolvePlanActionLabel('free'), 'Get Started');
    assert.strictEqual(resolvePlanActionLabel('standard'), 'Upgrade to Plus');
    assert.strictEqual(resolvePlanActionLabel('premium'), 'Contact Sales');

    const rows = getPlanComparisonRows();
    assert.strictEqual(rows.length, 6);
    assert.ok(rows.every(r => !r.feature.toLowerCase().includes('sla')));
    const serialized = JSON.stringify(SUBSCRIPTION_PLANS) + JSON.stringify(rows);
    assert.ok(!serialized.toLowerCase().includes('unlimited'));
    assert.ok(!serialized.toLowerCase().includes('simulated leak'));
    assert.ok(!serialized.toLowerCase().includes('simulated valve'));
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
    assert.ok(html.includes('AquaWatt Plus'));
    assert.ok(html.includes('AquaWatt Business'));
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
          { value: 0, prefix: '₹', label: 'Starter Explorer / month' },
          { value: 149, prefix: '₹', label: 'AquaWatt Plus / month' },
          { value: 499, prefix: '₹', suffix: '+', label: 'AquaWatt Business / month' },
        ],
        transfers: [
          {
            route: 'AquaWatt Plus · Analytics',
            from: { code: 'MO', symbol: 'M', amount: 1, decimals: 0 },
            to: { code: 'INR', symbol: '₹', decimals: 0 },
            rate: 149,
            settled: 'AI tips & FS-S401 insights',
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
    assert.ok(html.includes('AquaWatt Plus / month'));
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

  it('renders AquaWatt Footer with verified labels, valid routes, and unchanged contact email', () => {
    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(Footer, null)
      )
    );

    assert.ok(html.includes('Subscribe for AquaWatt Updates'));
    assert.ok(html.includes('Need a Custom IoT Integration?'));
    assert.ok(html.includes('mailto:aquawatt.sol@gmail.com'));
    assert.ok(html.includes('INA219 Power Sensor'));
    assert.ok(html.includes('FS-S401 Water Flow Sensor'));
    assert.ok(html.includes('Multi-Device Support'));
    assert.ok(!html.includes('24/7 Operations Desk'));
    assert.ok(!html.includes('Municipal Partnerships'));
    assert.ok(!html.includes('Telemetry Security Specs'));
    assert.ok(!html.includes('Security &amp; Telemetry Docs'));
  });

  it('renders ContactWithGlobe cleanly via SSR with wireframe globe SVG and form controls', () => {
    const html = renderToString(React.createElement(ContactWithGlobe, null));

    assert.ok(html.includes('Send an Inquiry or Incident Report'));
    assert.ok(html.includes('mailto:aquawatt.sol@gmail.com'));
    assert.ok(html.includes('Interactive 3D wireframe globe'));
    assert.ok(html.includes('Full Name *'));
    assert.ok(html.includes('Work Email *'));
    assert.ok(html.includes('Submit'));
  });

  it('renders ScrollFAQAccordion cleanly via SSR with AquaWatt diagnostic FAQ items', () => {
    const data = FAQ_ITEMS.map((item, idx) => ({
      id: idx + 1,
      question: item.question,
      answer: item.answer,
    }));
    const html = renderToString(
      React.createElement(ScrollFAQAccordion, {
        data,
        title: 'Knowledge Base & Diagnostics',
        subtitle: 'ESP32 hardware notes and telemetry guides.',
      })
    );

    assert.ok(html.includes('Knowledge Base &amp; Diagnostics'));
    assert.ok(html.includes('What hardware architecture does AquaWatt use?'));
    assert.ok(html.includes('FS-S401 Hall-effect pulse water flow sensor'));
    assert.ok(!html.includes('Ruixen UI'));
  });

  it('renders HomeSectionBadge with divided icon slot and rose-to-indigo gradient text', () => {
    const html = renderToString(
      React.createElement(HomeSectionBadge, { icon: '💧', children: 'Impact Ledger' })
    );

    assert.ok(html.includes('divide-x'));
    assert.ok(html.includes('from-rose-500'));
    assert.ok(html.includes('to-indigo-500'));
    assert.ok(html.includes('bg-clip-text'));
    assert.ok(html.includes('text-transparent'));
    assert.ok(html.includes('💧'));
    assert.ok(html.includes('Impact Ledger'));
  });
});
