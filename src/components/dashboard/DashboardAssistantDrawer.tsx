import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  Droplet,
  Zap,
  Info,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import {
  ChatMessage,
  sendAssistantMessage,
  getActiveAuthToken,
  setDevBearerToken,
} from '../../services/assistantApiClient';
import { useApp } from '../../context/AppContext';

interface DashboardAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDeviceId?: string;
}

const SUGGESTED_PROMPTS = [
  {
    label: 'Latest Water Flow',
    prompt: 'What is the latest verified water flow reading from my FS-S401 sensor?',
    icon: Droplet,
  },
  {
    label: 'Leak Investigation',
    prompt: 'Analyze nighttime flow for possible continuous flow or micro-leaks.',
    icon: AlertTriangle,
  },
  {
    label: 'Electricity Status',
    prompt: 'What is the current status of electricity and power monitoring?',
    icon: Zap,
  },
  {
    label: 'Sustainability Score',
    prompt: 'Generate my monthly sustainability report and eco-efficiency score.',
    icon: CheckCircle2,
  },
  {
    label: 'Device Status',
    prompt: 'List all devices in my facility and verify their hardware status.',
    icon: Cpu,
  },
];

function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export const DashboardAssistantDrawer: React.FC<DashboardAssistantDrawerProps> = ({
  isOpen,
  onClose,
  selectedDeviceId,
}) => {
  const { isAuthenticated } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-01',
      role: 'assistant',
      content:
        `Hello! I am the AquaWatt Facility Assistant. I query live domain services to analyze your water consumption, evaluate possible flow anomalies, and audit facility sustainability.\n\n` +
        `**Hardware Grounding:** Telemetry is strictly derived from your verified FS-S401 pulse flow sensor. Line pressure, water temperature, and INA219 DC power channels are uncalibrated or pending hardware verification and will remain null.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hardwareBoundaryNotes: [
        'FS-S401 pulse flow meter is operational',
        'INA219 power fields strictly null (pending hardware calibration)',
        'Anomalies are reported as observations, never confirmed leaks',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenSettings, setShowTokenSettings] = useState(false);
  const [hasAuthToken, setHasAuthToken] = useState<boolean>(isAuthenticated);

  const drawerRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Check auth state, manage focus capture/restore on open/close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      getActiveAuthToken().then(tok => {
        setHasAuthToken(Boolean(tok));
      });
      const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(timer);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen, isAuthenticated]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Escape key & Tab focus trap while open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = async (messageText?: string) => {
    const query = (messageText || input).trim();
    if (!query || isLoading) return;

    setInput('');
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build history excluding welcome prompt
      const history = messages
        .filter(m => m.id !== 'welcome-01')
        .slice(-6)
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const res = await sendAssistantMessage({
        message: query,
        deviceId: selectedDeviceId,
        history,
      });

      const assistantMessage: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        retrievedToolCalls: res.retrievedToolCalls,
        hardwareBoundaryNotes: res.hardwareBoundaryNotes,
        structuredData: res.data,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
      if (msg.includes('Authentication required') || msg.includes('JWT')) {
        setHasAuthToken(false);
        setShowTokenSettings(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: 'Conversation history reset. How can I assist with your facility resources?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hardwareBoundaryNotes: ['Grounding: FS-S401 physical sensor only'],
      },
    ]);
    setErrorMessage(null);
  };

  const handleSaveToken = () => {
    if (tokenInput.trim()) {
      setDevBearerToken(tokenInput.trim());
      setHasAuthToken(true);
      setShowTokenSettings(false);
      setErrorMessage(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <aside
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="AquaWatt AI Assistant"
          className="w-screen max-w-lg bg-white dark:bg-[#0D1524] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full"
        >
          {/* HEADER */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-[#F7F9FB] dark:bg-[#121B2B] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#174A8B] flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white font-heading tracking-tight">
                    AquaWatt Assistant
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[#237A57] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                    GROUNDED
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Natural-language telemetry audit &amp; anomaly analysis
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearHistory}
                title="Clear conversation"
                aria-label="Clear conversation"
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowTokenSettings(!showTokenSettings)}
                title="Authentication configuration"
                aria-label="Authentication configuration"
                aria-expanded={showTokenSettings}
                className={`p-2 rounded-md transition-colors cursor-pointer ${
                  showTokenSettings
                    ? 'bg-slate-200 dark:bg-slate-800 text-[#174A8B] dark:text-sky-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close assistant"
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* HARDWARE TRANSPARENCY BANNER */}
          <div className="px-5 py-2 bg-slate-50 dark:bg-[#0A101C] border-b border-slate-200/80 dark:border-slate-800/80 text-[11px] font-mono flex items-center justify-between gap-2 overflow-x-auto shrink-0">
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Water: FS-S401 Verified</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Power: INA219 Pending</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 whitespace-nowrap">
              <span>Leak: Unconfirmed</span>
            </span>
          </div>

          {/* TOKEN SETTINGS DRAWER (COLLAPSIBLE) */}
          {showTokenSettings && (
            <div className="p-4 bg-slate-50 dark:bg-[#121B2B] border-b border-slate-200 dark:border-slate-800 text-xs shrink-0 animate-in fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#174A8B] dark:text-sky-400" />
                  Supabase Bearer JWT Credentials
                </span>
                <span className="text-[10px] font-mono text-slate-400">Server verified</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                If Supabase authentication is configured, your session token is attached automatically.
                You may also manually specify a Bearer JWT below:
              </p>
              <div className="flex gap-2">
                <label htmlFor="assistant-bearer-token" className="sr-only">
                  Supabase Bearer JWT token
                </label>
                <input
                  id="assistant-bearer-token"
                  type="password"
                  placeholder="Bearer eyJhbGciOi..."
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-[#174A8B]"
                />
                <button
                  type="button"
                  onClick={handleSaveToken}
                  className="px-3 py-1.5 rounded-lg bg-[#174A8B] hover:bg-[#123A6F] text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* MESSAGES SCROLL AREA */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#174A8B] flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#174A8B] text-white rounded-br-xs'
                      : 'bg-white dark:bg-[#121B2B] text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-800/90 rounded-bl-xs shadow-xs'
                  }`}
                >
                  {/* Content with inline bold formatting */}
                  <div className="whitespace-pre-line space-y-1.5">
                    {msg.content.split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{renderInlineBold(paragraph)}</p>
                    ))}
                  </div>

                  {/* Tool execution tags */}
                  {msg.retrievedToolCalls && msg.retrievedToolCalls.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-400">Services:</span>
                      {msg.retrievedToolCalls.map((tool, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Hardware boundary notes */}
                  {msg.hardwareBoundaryNotes && msg.hardwareBoundaryNotes.length > 0 && (
                    <div className="mt-2 p-2 rounded-md bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                      <div className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 font-mono uppercase tracking-wider">
                        <Info className="w-3 h-3 text-[#174A8B] dark:text-sky-400" />
                        Boundary Invariants
                      </div>
                      {msg.hardwareBoundaryNotes.map((note, idx) => (
                        <div key={idx} className="flex items-start gap-1 font-mono">
                          <span>•</span>
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-1 text-right text-[10px] font-mono text-slate-400 opacity-70">
                    {msg.timestamp}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-7 h-7 rounded-lg bg-[#174A8B] flex items-center justify-center text-white shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#121B2B] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#174A8B] animate-ping" />
                  <span>Querying AquaWatt domain services...</span>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Unable to complete request</p>
                  <p className="mt-0.5 text-[11px]">{errorMessage}</p>
                  {errorMessage.includes('Authentication') && (
                    <button
                      type="button"
                      onClick={() => setShowTokenSettings(true)}
                      className="mt-2 underline font-medium text-xs block text-rose-800 dark:text-rose-200 cursor-pointer"
                    >
                      Configure authentication token →
                    </button>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* SUGGESTED PROMPT CHIPS */}
          <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-[#F7F9FB]/60 dark:bg-[#0A101C]/60 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 block mb-1.5 uppercase tracking-wider">
              Suggested Domain Audits
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {SUGGESTED_PROMPTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSend(item.prompt)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#121B2B] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-800 text-[11px] font-sans font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Icon className="w-3 h-3 text-[#174A8B] dark:text-sky-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* INPUT BAR */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1524] shrink-0">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="assistant-chat-input" className="sr-only">
                Ask AquaWatt assistant about water flow, leaks, or hardware status
              </label>
              <input
                id="assistant-chat-input"
                ref={inputRef}
                type="text"
                placeholder="Ask about water flow, leaks, or hardware status..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F7F9FB] dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#174A8B] transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="p-2 rounded-xl bg-[#174A8B] hover:bg-[#123A6F] text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Authorized read-only domain services</span>
              <span>Press Enter to send</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
