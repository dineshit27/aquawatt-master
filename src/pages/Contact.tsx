import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { useApp } from '../context/AppContext';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Headphones,
  Search,
  ChevronDown,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { FAQ_ITEMS } from '../data/mockData';
import { VelaHeroSection } from '../components/contact/VelaHeroSection';

interface FormState {
  fullName: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}

export const Contact: React.FC = () => {
  const { showToast } = useApp();
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    category: 'Hardware & Sensor Setup',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [searchFaq, setSearchFaq] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (!form.subject.trim()) {
      newErrors.subject = 'Please enter an inquiry subject';
    }

    if (!form.message.trim() || form.message.trim().length < 10) {
      newErrors.message = 'Inquiry message must contain at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedMessage(
        `Thank you, ${form.fullName}. Your ticket regarding "${form.subject}" has been logged in our demonstration system (Ticket #AQW-${Math.floor(
          10000 + Math.random() * 90000
        )}).`
      );
      showToast('Support ticket logged successfully (simulation)', 'success');
      setForm({
        fullName: '',
        email: '',
        category: 'Hardware & Sensor Setup',
        subject: '',
        message: '',
      });
      setErrors({});
    }, 1200);
  };

  const filteredFaqs = FAQ_ITEMS.filter(
    item =>
      item.question.toLowerCase().includes(searchFaq.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchFaq.toLowerCase())
  );

  return (
    <AppLayout
      title="Technical Support & Operations Desk"
      hero={
        <VelaHeroSection
          onScrollLearnMore={() => {
            document.getElementById('contact-channels')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      }
    >
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* 3 SUPPORT CHANNELS */}
        <div id="contact-channels" className="grid grid-cols-1 sm:grid-cols-3 gap-4 scroll-mt-6">
          <div className="p-5 rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-sky-950 text-[#174A8B] dark:text-sky-400 flex items-center justify-center mb-3">
              <Phone className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold font-heading text-slate-900 dark:text-white">
              Testbench Engineering Line
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Simulated leak alert tuning, FS-S401 wiring checks, and serial/MQTT diagnostics.
            </p>
            <p className="text-xs font-mono font-bold text-[#174A8B] dark:text-sky-400 mt-3">
              +91 80 4120 7700 (Lab Desk)
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-[#237A57] dark:text-emerald-400 flex items-center justify-center mb-3">
              <Mail className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold font-heading text-slate-900 dark:text-white">
              Engineering Support Desk
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              ESP32 pulse flow calibration, CT current sensor setup, and MQTT telemetry.
            </p>
            <p className="text-xs font-mono font-bold text-[#237A57] dark:text-emerald-400 mt-3">
              support@aquawatt.io
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold font-heading text-slate-900 dark:text-white">
              Guaranteed SLA Response
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Standard Pro tickets responded in &lt; 2 hours. Enterprise monitored 24/7.
            </p>
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-3">
              99.98% Gateway Uptime
            </p>
          </div>
        </div>

        {/* TWO-COLUMN LAYOUT: FORM ON LEFT, FAQ ON RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT 7 COLS: INTERACTIVE CONTACT FORM */}
          <div
            id="contact-form"
            className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-7 shadow-xs scroll-mt-6"
          >
            <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">
              Send an Inquiry or Incident Report
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              All inquiries are routed directly to on-call telemetry engineers.
            </p>

            {submittedMessage ? (
              <div className="mt-6 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#237A57] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-200">
                      Inquiry Dispatched (Local Simulation)
                    </h4>
                    <p className="text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                      {submittedMessage}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmittedMessage(null)}
                      className="mt-4 px-3 py-1.5 rounded-lg bg-[#237A57] text-white font-semibold cursor-pointer"
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-fullName" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      id="contact-fullName"
                      type="text"
                      placeholder="e.g. Marc Hürzeler"
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? 'contact-fullName-err' : undefined}
                      value={form.fullName}
                      onChange={e => setForm({ ...form, fullName: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-lg border bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B] transition-all ${
                        errors.fullName ? 'border-rose-400 ring-rose-200' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    {errors.fullName && (
                      <span id="contact-fullName-err" role="alert" className="text-rose-500 text-[11px] mt-1 block">{errors.fullName}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Work Email *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      placeholder="marc@facility.ch"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'contact-email-err' : undefined}
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-lg border bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B] transition-all ${
                        errors.email ? 'border-rose-400 ring-rose-200' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    {errors.email && (
                      <span id="contact-email-err" role="alert" className="text-rose-500 text-[11px] mt-1 block">{errors.email}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-category" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Inquiry Category
                    </label>
                    <select
                      id="contact-category"
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B]"
                    >
                      <option value="Hardware & Sensor Setup">Hardware &amp; ESP32 Sensor Setup</option>
                      <option value="Anomaly Detection Tuning">Anomaly Threshold &amp; Leak Calibration</option>
                      <option value="ESG Reporting Compliance">ESG Scope 1 &amp; 2 Audit Support</option>
                      <option value="Enterprise Integration">REST / MQTT Webhook Integration</option>
                      <option value="Billing & Plans">Subscription &amp; Billing Questions</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Subject *
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      placeholder="Brief summary of request"
                      aria-invalid={Boolean(errors.subject)}
                      aria-describedby={errors.subject ? 'contact-subject-err' : undefined}
                      value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-lg border bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B] transition-all ${
                        errors.subject ? 'border-rose-400 ring-rose-200' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    {errors.subject && (
                      <span id="contact-subject-err" role="alert" className="text-rose-500 text-[11px] mt-1 block">{errors.subject}</span>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Detailed Message *
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    placeholder="Provide details regarding sensor readings, hub serial, or facility question..."
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? 'contact-message-err' : undefined}
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-lg border bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B] transition-all resize-none ${
                      errors.message ? 'border-rose-400 ring-rose-200' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  {errors.message && (
                    <span id="contact-message-err" role="alert" className="text-rose-500 text-[11px] mt-1 block">{errors.message}</span>
                  )}
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 font-mono">
                    * Required fields • Local simulated dispatch
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-[#174A8B] hover:bg-[#123A6F] text-white font-semibold transition-colors shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Transmitting...' : 'Send Message'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* RIGHT 5 COLS: SEARCHABLE FAQ & OFFICE LOCATIONS */}
          <div className="lg:col-span-5 space-y-6">
            {/* Searchable FAQ */}
            <div
              id="contact-faq"
              className="rounded-2xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs scroll-mt-6"
            >
              <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">
                Knowledge Base &amp; Diagnostics
              </h3>

              {/* Search Bar */}
              <div className="mt-3 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <label htmlFor="contact-faq-search" className="sr-only">
                  Search sensor guides and frequently asked questions
                </label>
                <input
                  id="contact-faq-search"
                  type="text"
                  placeholder="Search sensor guides & questions..."
                  value={searchFaq}
                  onChange={e => setSearchFaq(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B]"
                />
              </div>

              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredFaqs.length === 0 ? (
                  <p className="py-4 text-center text-slate-400">No matching articles found.</p>
                ) : (
                  filteredFaqs.map((faq, idx) => {
                    const isOpen = expandedFaq === idx;
                    const panelId = `contact-faq-answer-${idx}`;
                    return (
                      <div key={idx} className="py-3">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => setExpandedFaq(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between text-left font-medium text-slate-900 dark:text-white gap-2 cursor-pointer"
                        >
                          <span className="text-[11px]">{faq.question}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                              isOpen ? 'rotate-180 text-[#174A8B]' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <p id={panelId} className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                            {faq.answer}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* IoT Testbench & Developer Lab Location Card */}
            <div className="rounded-2xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs text-xs space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#174A8B] dark:text-sky-400" />
                AquaWatt IoT Testbench & Developer Lab
              </h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                AquaWatt Open IoT Project<br />
                Hardware Testbench & Embedded Systems Lab<br />
                Bengaluru, India · Remote Community Network
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] font-mono text-slate-400">
                Operating Hours: Mon–Fri 09:00–18:00 IST · MQTT & Serial Inquiries Welcome
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
