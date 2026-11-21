import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSimulatedSupportTicket,
  filterFaqs,
  validateContactForm,
  type ContactFormState,
} from './supportService.js';
import {
  formatPlanPriceLabel,
  getPlanComparisonRows,
  getPlanPrice,
  resolvePlanActionLabel,
} from '../utils/subscriptionHelpers.js';
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
});
