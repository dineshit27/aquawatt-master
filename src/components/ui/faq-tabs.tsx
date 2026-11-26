import React, { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FAQItemData {
  question: string;
  answer: string;
}

export interface FAQProps<T extends string = string>
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: string;
  subtitle?: string;
  categories: Record<T, string>;
  faqData: Record<T, FAQItemData[]>;
}

export function FAQ<T extends string = string>({
  title = 'FAQs',
  subtitle = 'Frequently Asked Questions',
  categories,
  faqData,
  className,
  ...props
}: FAQProps<T>) {
  const categoryKeys = Object.keys(categories) as T[];
  const [selectedCategory, setSelectedCategory] = useState<T>(categoryKeys[0]);
  const instanceId = useId();
  const prefersReducedMotion = Boolean(useReducedMotion());

  if (categoryKeys.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby={`${instanceId}-heading`}
      className={cn(
        'relative overflow-hidden bg-background px-4 py-12 sm:px-8 text-foreground',
        className
      )}
      {...props}
    >
      <FAQHeader headingId={`${instanceId}-heading`} title={title} subtitle={subtitle} />
      <FAQTabs
        instanceId={instanceId}
        categories={categories}
        selected={selectedCategory}
        setSelected={setSelectedCategory}
        reducedMotion={prefersReducedMotion}
      />
      <FAQList
        instanceId={instanceId}
        faqData={faqData}
        selected={selectedCategory}
        reducedMotion={prefersReducedMotion}
      />
    </section>
  );
}

interface FAQHeaderProps {
  headingId: string;
  title: string;
  subtitle: string;
}

const FAQHeader: React.FC<FAQHeaderProps> = ({ headingId, title, subtitle }) => (
  <div className="relative z-10 flex flex-col items-center justify-center text-center">
    <span className="mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-xs sm:text-sm font-medium tracking-wide text-transparent">
      {subtitle}
    </span>
    <h2
      id={headingId}
      className="mb-7 text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground text-balance"
    >
      {title}
    </h2>
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -top-[350px] left-1/2 z-0 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 blur-3xl"
    />
  </div>
);

interface FAQTabsProps<T extends string> {
  instanceId: string;
  categories: Record<T, string>;
  selected: T;
  setSelected: (category: T) => void;
  reducedMotion: boolean;
}

function FAQTabs<T extends string>({
  instanceId,
  categories,
  selected,
  setSelected,
  reducedMotion,
}: FAQTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label="FAQ categories"
      className="relative z-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
    >
      {(Object.entries(categories) as Array<[T, string]>).map(([key, label]) => {
        const isSelected = selected === key;
        return (
          <button
            key={key}
            id={`${instanceId}-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={`${instanceId}-panel-${key}`}
            onClick={() => setSelected(key)}
            className={cn(
              'relative overflow-hidden whitespace-nowrap shrink-0 rounded-md border px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              isSelected
                ? 'border-primary text-primary-foreground'
                : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="relative z-10">{label}</span>
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.span
                  initial={reducedMotion ? false : { y: '100%' }}
                  animate={{ y: '0%' }}
                  exit={reducedMotion ? { opacity: 0 } : { y: '100%' }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
                  className="absolute inset-0 z-0 bg-gradient-to-r from-primary to-primary/85"
                />
              )}
            </AnimatePresence>
          </button>
        );
      })}
    </div>
  );
}

interface FAQListProps<T extends string> {
  instanceId: string;
  faqData: Record<T, FAQItemData[]>;
  selected: T;
  reducedMotion: boolean;
}

function FAQList<T extends string>({
  instanceId,
  faqData,
  selected,
  reducedMotion,
}: FAQListProps<T>) {
  const questions = faqData[selected] ?? [];

  return (
    <div className="relative z-10 mx-auto mt-10 max-w-3xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          id={`${instanceId}-panel-${selected}`}
          role="tabpanel"
          aria-labelledby={`${instanceId}-tab-${selected}`}
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
          className="space-y-3.5"
        >
          {questions.map((faq, index) => (
            <FAQItem
              key={`${selected}-${faq.question}`}
              itemId={`${instanceId}-${selected}-${index}`}
              defaultOpen={index === 0}
              reducedMotion={reducedMotion}
              {...faq}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface FAQItemProps extends FAQItemData {
  itemId: string;
  defaultOpen?: boolean;
  reducedMotion: boolean;
}

const FAQItem: React.FC<FAQItemProps> = ({
  itemId,
  question,
  answer,
  defaultOpen = false,
  reducedMotion,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const answerId = `${itemId}-answer`;

  return (
    <motion.div
      animate={isOpen ? 'open' : 'closed'}
      className={cn(
        'rounded-xl border border-border transition-colors',
        isOpen ? 'bg-muted/50' : 'bg-card'
      )}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={answerId}
        onClick={() => setIsOpen(prev => !prev)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          className={cn(
            'text-sm sm:text-base font-medium transition-colors',
            isOpen ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {question}
        </span>
        <motion.span
          variants={{
            open: { rotate: '45deg' },
            closed: { rotate: '0deg' },
          }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
          className="shrink-0"
        >
          <Plus
            aria-hidden="true"
            className={cn(
              'h-5 w-5 transition-colors',
              isOpen ? 'text-foreground' : 'text-muted-foreground'
            )}
          />
        </motion.span>
      </button>
      <motion.div
        id={answerId}
        initial={false}
        animate={
          reducedMotion
            ? {
                height: isOpen ? 'auto' : '0px',
                opacity: isOpen ? 1 : 0,
                marginBottom: isOpen ? '16px' : '0px',
              }
            : {
                height: isOpen ? 'auto' : '0px',
                opacity: isOpen ? 1 : 0,
                marginBottom: isOpen ? '16px' : '0px',
              }
        }
        transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeInOut' }}
        className="overflow-hidden px-4"
      >
        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">{answer}</p>
      </motion.div>
    </motion.div>
  );
};
