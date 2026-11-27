import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Seo } from '../components/common/Seo';
import { useApp } from '../context/AppContext';
import {
  Mail,
  Terminal,
  Clock,
  Search,
} from 'lucide-react';
import { FAQ_ITEMS } from '../data/mockData';
import { ContactHeroSection } from '../components/contact/ContactHeroSection';
import ContactWithGlobe from '../components/ui/contact-with-globe';
import ScrollFAQAccordion, { type FAQItem } from '../components/ui/scroll-faqaccordion';
import {
  validateContactForm,
  createSimulatedSupportTicket,
  filterFaqs,
  type ContactFormState,
} from '../services/supportService';

export const Contact: React.FC = () => {
  const { showToast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState<ContactFormState>({
    fullName: '',
    email: '',
    category: 'Hardware & Sensor Setup',
    subject: '',
    message: '',
  });

  useEffect(() => {
    if (searchParams.get('plan') === 'business') {
      setForm(prev => ({
        ...prev,
        category: 'Billing & Plans',
        subject: prev.subject || 'AquaWatt Business Deployment Inquiry (Starting at ₹499/mo)',
      }));
      setSearchParams({}, { replace: true });
      window.setTimeout(() => {
        document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  }, [searchParams, setSearchParams]);

  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [searchFaq, setSearchFaq] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateContactForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const ticket = createSimulatedSupportTicket(form);
      setIsSubmitting(false);
      setSubmittedMessage(ticket.confirmationMessage);
      showToast(`Support inquiry logged (local simulation #${ticket.ticketId})`, 'success');
      setForm({
        fullName: '',
        email: '',
        category: 'Hardware & Sensor Setup',
        subject: '',
        message: '',
      });
      setErrors({});
    }, 600);
  };

  const filteredFaqs = useMemo(() => filterFaqs(FAQ_ITEMS, searchFaq), [searchFaq]);
  const scrollFaqItems: FAQItem[] = useMemo(
    () =>
      filteredFaqs.map((faq, idx) => ({
        id: idx + 1,
        question: faq.question,
        answer: faq.answer,
      })),
    [filteredFaqs]
  );

  return (
    <AppLayout
      title="Technical Support & Operations Desk"
      hero={
        <ContactHeroSection
          onScrollLearnMore={() => {
            document.getElementById('contact-channels')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      }
    >
      <Seo
        title="Contact AquaWatt — Support & Hardware Questions"
        description="Get in touch about AquaWatt: sensor setup, dashboard questions and project enquiries."
      />
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* 3 SUPPORT CHANNELS */}
        <div id="contact-channels" className="grid grid-cols-1 sm:grid-cols-3 gap-4 scroll-mt-6">
          <div className="p-5 rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-sky-950 text-[#174A8B] dark:text-sky-400 flex items-center justify-center mb-3">
              <Terminal className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold font-heading text-slate-900 dark:text-white">
              Testbench Serial &amp; Repo
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              FS-S401 wiring notes, GPIO34 interrupt debugging, and MQTT schema documentation.
            </p>
            <p className="text-xs font-mono font-bold text-[#174A8B] dark:text-sky-400 mt-3">
              GitHub · dineshit27/aquawatt-master
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
              ESP32 pulse flow calibration, INA219 DC setup, and Supabase schema questions.
            </p>
            <p className="text-xs font-mono font-bold text-[#237A57] dark:text-emerald-400 mt-3">
              aquawatt.sol@gmail.com (Project Mailbox)
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold font-heading text-slate-900 dark:text-white">
              Best-Effort Prototype Support
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Inquiries on this page simulate local ticket confirmation; live backend ticketing is not wired.
            </p>
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-3">
              Local Simulation · No SLA Promise
            </p>
          </div>
        </div>

        {/* INTERACTIVE GLOBE + INQUIRY FORM */}
        <ContactWithGlobe
          id="contact-form"
          subtitle="Contact AquaWatt"
          title="Send an Inquiry or Incident Report"
          description="Reach out regarding FS-S401 flow sensors, ESP32 serial diagnostics, Supabase schema setup, or AquaWatt Business onboarding."
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs"
          form={form}
          onFormChange={setForm}
          errors={errors}
          isSubmitting={isSubmitting}
          submittedMessage={submittedMessage}
          onResetSubmitted={() => setSubmittedMessage(null)}
          onSubmit={handleSubmit}
        />

        {/* SEARCHABLE SCROLL FAQ ACCORDION */}
        <section
          id="contact-faq"
          aria-label="Knowledge Base and Diagnostics FAQ"
          className="rounded-2xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 shadow-xs scroll-mt-6"
        >
          <div className="max-w-md mx-auto mb-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="contact-faq-search" className="sr-only">
              Search sensor guides and frequently asked questions
            </label>
            <input
              id="contact-faq-search"
              type="text"
              placeholder="Search sensor guides & questions..."
              value={searchFaq}
              onChange={e => setSearchFaq(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B] dark:focus:ring-sky-400"
            />
          </div>

          {scrollFaqItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No matching articles found.
            </p>
          ) : (
            <ScrollFAQAccordion
              data={scrollFaqItems}
              title="Knowledge Base & Diagnostics"
              subtitle="Scroll or select any topic for ESP32 hardware notes, FS-S401 pulse telemetry details, and export guides."
              enableScrollPin={searchFaq.trim().length === 0}
              className="py-6 md:py-8"
            />
          )}
        </section>
      </div>
    </AppLayout>
  );
};
