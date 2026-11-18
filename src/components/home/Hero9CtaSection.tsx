import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { FaArrowRight } from 'react-icons/fa6';
import { Cpu, Droplets, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface Hero9Avatar {
  src: string;
  alt: string;
}

export interface Hero9CtaProps {
  eyebrowText?: string;
  avatars?: Hero9Avatar[];
  title?: string;
  description?: string;
  emailPlaceholder?: string;
  submitText?: string;
  backgroundImage?: string;
}

const defaultBackground = 'https://assets.watermelon.sh/hero-9-bg.avif';

const contentContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.12,
      staggerChildren: 0.1,
      delay: 0.15,
    },
  },
};

const contentItem: Variants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', duration: 0.72, bounce: 0 },
  },
};

const backgroundVariants: Variants = {
  hidden: { opacity: 0, scale: 1.035, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', duration: 1.15, bounce: 0 },
  },
};

export const Hero9CtaSection: React.FC<Hero9CtaProps> = ({
  eyebrowText = 'Built for Water & Energy Clarity',
  title = 'Monitor Every Drop\nMaster Every Watt',
  description = 'Track water flow, inspect electrical load profiles, and surface\nAI-guided conservation insights from one unified console.',
  emailPlaceholder = 'Enter your Email',
  submitText = 'Launch Console',
  backgroundImage = defaultBackground,
}) => {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed) {
      showToast(`Workspace ready for ${trimmed}. Opening AquaWatt console...`, 'info');
      setEmail('');
    }
    navigate('/dashboard');
  };

  return (
    <section
      aria-label="Get started call to action"
      className="relative isolate w-full overflow-hidden bg-sky-300 font-sans text-slate-950 antialiased border-t border-slate-200/80 dark:border-slate-800/80"
    >
      <motion.div
        variants={backgroundVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        className="absolute inset-0 will-change-transform bg-gradient-to-b from-sky-300 via-sky-200 to-sky-400"
        aria-hidden="true"
      >
        <img
          src={backgroundImage}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center outline-1 outline-black/10"
        />
      </motion.div>

      <div className="relative z-10 mx-auto flex min-h-[620px] sm:min-h-[680px] w-full max-w-[1440px] flex-col justify-center px-5 py-24 sm:px-9 sm:py-32 lg:px-[58px]">
        <motion.div
          variants={contentContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          className="mx-auto flex w-full max-w-[760px] flex-col items-center text-center"
        >
          <motion.div
            variants={contentItem}
            className="inline-flex min-h-7 items-center gap-2 rounded-full bg-white/30 px-1.5 pr-4 py-1 text-xs leading-none font-semibold text-slate-800 shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-md"
          >
            <span className="flex -space-x-1.5">
              <span className="grid size-5 place-items-center rounded-full bg-sky-600 text-white shadow-xs ring-1 ring-white/80">
                <Droplets className="size-3" />
              </span>
              <span className="grid size-5 place-items-center rounded-full bg-amber-500 text-white shadow-xs ring-1 ring-white/80">
                <Zap className="size-3" />
              </span>
              <span className="grid size-5 place-items-center rounded-full bg-[#174A8B] text-white shadow-xs ring-1 ring-white/80">
                <Cpu className="size-3" />
              </span>
            </span>
            <span>{eyebrowText}</span>
          </motion.div>

          <motion.h2
            variants={contentItem}
            className="hero9-cta-heading mt-5 max-w-[735px] text-[clamp(2.25rem,6.1vw,4.75rem)] leading-[0.95] font-medium text-balance whitespace-pre-line text-slate-950"
          >
            {title}
          </motion.h2>

          <motion.p
            variants={contentItem}
            className="mt-5 max-w-[510px] text-[clamp(0.95rem,1.45vw,1.12rem)] leading-[1.34] font-normal text-pretty whitespace-pre-line text-slate-700"
          >
            {description}
          </motion.p>

          <motion.form
            variants={contentItem}
            onSubmit={handleSubmit}
            className="mt-6 flex w-full max-w-md flex-col gap-1.5 rounded-[28px] bg-white/26 p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_18px_50px_rgba(255,255,255,0.34),inset_0_1px_0_rgba(255,255,255,0.55)] outline-1 outline-white/45 backdrop-blur-[1px] min-[430px]:flex-row min-[430px]:rounded-full"
          >
            <label htmlFor="hero9-email" className="sr-only">
              Email
            </label>
            <input
              id="hero9-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={emailPlaceholder}
              className="min-h-10 w-full min-w-0 flex-1 bg-transparent px-5 text-center text-sm font-medium text-slate-900 outline-none placeholder:text-slate-700/80 min-[430px]:text-left"
            />
            <motion.button
              type="submit"
              whileTap={{ scale: 0.96 }}
              className="group inline-flex min-h-10 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-white px-4 text-sm font-medium text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-slate-50 hover:shadow-[0_2px_6px_rgba(15,23,42,0.09)] min-[430px]:w-auto"
            >
              <span>{submitText}</span>
              <FaArrowRight className="size-3 duration-200 group-hover:translate-x-0.5" />
            </motion.button>
          </motion.form>
        </motion.div>
      </div>
    </section>
  );
};
