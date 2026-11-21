export interface ContactFormState {
  fullName: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}

export type ContactFormErrors = Partial<Record<keyof ContactFormState, string>>;

export interface SimulatedSupportTicket {
  ticketId: string;
  submittedAt: string;
  isSimulation: true;
  confirmationMessage: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(form: ContactFormState): ContactFormErrors {
  const errors: ContactFormErrors = {};

  if (!form.fullName.trim() || form.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  }

  if (!form.email.trim() || !EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = 'Please provide a valid email address';
  }

  if (!form.subject.trim() || form.subject.trim().length < 3) {
    errors.subject = 'Please enter an inquiry subject';
  }

  if (!form.message.trim() || form.message.trim().length < 10) {
    errors.message = 'Inquiry message must contain at least 10 characters';
  }

  return errors;
}

export function createSimulatedSupportTicket(
  form: Pick<ContactFormState, 'fullName' | 'subject'>,
  randomSeed: number = Math.random()
): SimulatedSupportTicket {
  const bounded = Math.min(0.99999, Math.max(0, randomSeed));
  const code = Math.floor(10000 + bounded * 90000);
  const ticketId = `AQW-${code}`;
  const name = form.fullName.trim();
  const subject = form.subject.trim();

  return {
    ticketId,
    submittedAt: new Date().toISOString(),
    isSimulation: true,
    confirmationMessage: `Thank you, ${name}. Your inquiry regarding "${subject}" has been logged in the local frontend simulation (Reference #${ticketId}). Live email dispatch is not enabled in this prototype.`,
  };
}

export function filterFaqs(items: FaqEntry[], query: string): FaqEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter(
    item =>
      item.question.toLowerCase().includes(normalized) ||
      item.answer.toLowerCase().includes(normalized)
  );
}
