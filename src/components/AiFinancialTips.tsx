import React, { useState, useEffect } from 'react';
import { CurrencyConfig, FinancialTipItem, ChatMessage } from '../types';
import { fetchAiFinancialTips, askFinancialAdvisorAi } from '../services/aiApi';
import advisorAvatar from '../assets/images/advisor_avatar_1790454432998.jpg';
import {
  Sparkles,
  Send,
  MessageSquare,
  TrendingUp,
  Shield,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface Props {
  currency: CurrencyConfig;
}

const CATEGORIES = [
  'Loan Optimization & Refinancing',
  'Credit Score Hacks & Bureau Mastery',
  'Tax Shields & Mortgage Deductions',
  'Debt Snowball & Net Worth Defense',
];

const PRESET_TIPS: Record<string, FinancialTipItem[]> = {
  'Loan Optimization & Refinancing': [
    {
      title: 'The Bi-Weekly Mortgage Acceleration Hack',
      tagline: 'Make 26 half-payments a year to pay off 1 full extra month.',
      explanation:
        'By splitting your monthly EMI in half and paying every two weeks, you make 26 half-payments annually (the equivalent of 13 full months). This silently knocks 4 to 6 years off a 30-year mortgage without altering your monthly budget.',
      financialImpact: 'Saves ~$34,000 in compound interest on a $300k mortgage.',
      difficulty: 'Easy',
    },
    {
      title: 'Interest Rate Spread Arbitrage',
      tagline: 'Refinance as soon as benchmark rates drop by 75 basis points.',
      explanation:
        'When market lending margins soften by 0.75% or more, initiate a rate negotiation with your current lender before external refinancing. 80% of banks offer retention discounts to avoid loan churn.',
      financialImpact: 'Reduces monthly payment by $140-$220/month per $200k balance.',
      difficulty: 'Medium',
    },
  ],
  'Credit Score Hacks & Bureau Mastery': [
    {
      title: 'The Statement-Date Balance Flush',
      tagline: 'Pay balances 3 days BEFORE statement closing, not the due date.',
      explanation:
        'Bureaus receive your reported balance on your statement date, NOT your payment due date. Clearing your balance 3 days prior ensures a near-zero reported utilization (1-3%), causing a 15-35 point surge in your FICO/CIBIL score within 30 days.',
      financialImpact: 'Unlocks prime tier loan rates (0.5% - 1.2% lower APR).',
      difficulty: 'Easy',
    },
    {
      title: 'Authorized User Vintage Piggybacking',
      tagline: 'Get added to a high-limit, aged family card with zero missed payments.',
      explanation:
        'Being added as an authorized user inherits the account age and credit limit of that trade-line without requiring you to use the physical card. This dilutes your total utilization and adds instant credit vintage.',
      financialImpact: 'Can elevate thin credit files by 40-70 points in 45 days.',
      difficulty: 'Medium',
    },
  ],
};

const SUGGESTED_QUESTIONS = [
  'Should I take a 15-year or 30-year mortgage if my salary is steady?',
  'How will closing my oldest credit card affect my loan approval?',
  'What is the quickest way to lower my FOIR / DTI before applying?',
  'Is it better to prepay a 7.5% home loan or invest in an index fund?',
];

export const AiFinancialTips: React.FC<Props> = ({ currency }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const [tips, setTips] = useState<FinancialTipItem[]>(PRESET_TIPS[CATEGORIES[0]] || []);
  const [isLoadingTips, setIsLoadingTips] = useState<boolean>(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your AI BFSI Copilot. Ask me any question regarding loan underwriting, mortgage structures, credit scoring algorithms, or refinancing math.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatting, setIsChatting] = useState<boolean>(false);

  const handleFetchAiTips = async (category: string) => {
    setSelectedCategory(category);
    setIsLoadingTips(true);
    try {
      const res = await fetchAiFinancialTips({ focusCategory: category });
      if (res?.tips && res.tips.length > 0) {
        setTips(res.tips);
      } else {
        setTips(PRESET_TIPS[category] || PRESET_TIPS[CATEGORIES[0]]);
      }
    } catch (e) {
      console.warn('Using local curated fallback tips', e);
      setTips(PRESET_TIPS[category] || PRESET_TIPS[CATEGORIES[0]]);
    } finally {
      setIsLoadingTips(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim() || isChatting) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
    setIsChatting(true);

    try {
      const response = await askFinancialAdvisorAi({
        messages: [...chatMessages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        userContext: {
          currency: currency.code,
        },
      });

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content:
          'I apologize, but I could not reach the banking advisor service. Please verify your connection and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Lightbulb className="h-4 w-4" />
            </span>
            AI Financial Tips & Interactive Banking Copilot
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Curated tactical playbooks for interest minimization, credit score surges, and direct
            advisory reasoning.
          </p>
        </div>

        <button
          onClick={() => handleFetchAiTips(selectedCategory)}
          disabled={isLoadingTips}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTips ? 'animate-spin' : ''}`} />
          <span>{isLoadingTips ? 'Generating...' : 'Refresh AI Tips'}</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto gap-2 scrollbar-none pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleFetchAiTips(cat)}
            className={`px-3.5 py-2 text-xs font-medium rounded-xl whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'glass-card text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tips Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {tips.map((tip, idx) => (
          <div
            key={idx}
            className="glass-panel rounded-2xl p-5 sm:p-6 space-y-3.5 border-slate-800/80 hover:border-emerald-500/30 transition-all shadow-lg flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-400">
                  {tip.difficulty} Strategy
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                  BFSI Rule #{idx + 1}
                </span>
              </div>
              <h3 className="text-base font-bold text-white leading-snug">{tip.title}</h3>
              <p className="text-xs font-medium text-slate-300 italic">{tip.tagline}</p>
              <p className="text-xs text-slate-300 leading-relaxed">{tip.explanation}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Potential Impact:</span>
              <span className="font-semibold text-emerald-300 font-mono text-right">
                {tip.financialImpact}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive AI Banking Copilot Chat */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-emerald-500/30 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={advisorAvatar}
                alt="AI Advisor Avatar"
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-xl object-cover border border-emerald-500/40"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Claude AI Banking Copilot</span>
                <span className="text-[11px] font-mono font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Gemini 3.8 Flash Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ask specific debt restructuring, underwriting math, or mortgage questions
              </p>
            </div>
          </div>
        </div>

        {/* Suggested Quick Questions */}
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(q)}
              className="text-[11px] text-slate-300 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 hover:border-emerald-500/40 hover:text-white transition-colors text-left"
            >
              💬 {q}
            </button>
          ))}
        </div>

        {/* Chat History Messages */}
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs leading-relaxed ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-emerald-600/30 border border-emerald-500/40 text-white'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200'
                }`}
              >
                <div className="mb-1 text-[10px] text-slate-400 flex items-center justify-between gap-4">
                  <span>{msg.role === 'user' ? 'You' : 'AI Financial Copilot'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                {msg.content}
              </div>
            </div>
          ))}

          {isChatting && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-slate-400 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Evaluating financial scenario and computing underwriting models...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 pt-2 border-t border-slate-800/80"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask anything about loan eligibility, mortgage prepayments, or credit..."
            className="glass-input flex-1 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isChatting}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-40 transition-colors shrink-0 font-bold"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
