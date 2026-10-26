import React from 'react';
import { CurrencyConfig } from '../types';
import heroImg from '../assets/images/hero_bfsi_banking_1790454421104.jpg';
import { Calculator, Gauge, Cpu, FileSpreadsheet, ArrowRight } from 'lucide-react';

interface HeroBannerProps {
  onSelectTab: (tab: 'loan' | 'credit' | 'emi' | 'tips' | 'sheets') => void;
  currency: CurrencyConfig;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onSelectTab }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 p-6 sm:p-8 lg:p-10 mb-8 backdrop-blur-xl shadow-2xl">
      {/* Background ambient glow circles */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Headline and Value Proposition */}
        <div className="lg:col-span-7 space-y-5">
          {/* Zero-Pill Unboxed Metadata */}
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
            <span>BFSI Financial Intelligence</span>
            <span aria-hidden="true">·</span>
            <span>Real-Time AI Underwriting</span>
            <span aria-hidden="true">·</span>
            <span>Google Sheets Sync</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight text-balance">
            Precision AI Loan Decisions & Credit Architecture
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Accelerate your personal financial strategy with instant debt-to-income (FOIR)
            eligibility modeling, deep FICO/CIBIL credit score diagnostics, amortization
            optimization, and transparent persistence directly in your Google Sheets.
          </p>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <button
              onClick={() => onSelectTab('loan')}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-slate-900 transition-all text-left group"
            >
              <div>
                <Calculator className="h-4 w-4 text-emerald-400 mb-1" />
                <div className="text-xs font-semibold text-white">Eligibility</div>
                <div className="text-[11px] text-slate-400">Instant FOIR & Max Limit</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => onSelectTab('credit')}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-900 transition-all text-left group"
            >
              <div>
                <Gauge className="h-4 w-4 text-cyan-400 mb-1" />
                <div className="text-xs font-semibold text-white">Credit Score</div>
                <div className="text-[11px] text-slate-400">90-Day Boost Roadmap</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => onSelectTab('emi')}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-slate-900 transition-all text-left group"
            >
              <div>
                <Cpu className="h-4 w-4 text-indigo-400 mb-1" />
                <div className="text-xs font-semibold text-white">EMI Schedule</div>
                <div className="text-[11px] text-slate-400">Prepayment Savings</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => onSelectTab('sheets')}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-amber-500/50 hover:bg-slate-900 transition-all text-left group"
            >
              <div>
                <FileSpreadsheet className="h-4 w-4 text-amber-400 mb-1" />
                <div className="text-xs font-semibold text-white">Sheets Vault</div>
                <div className="text-[11px] text-slate-400">Secure Live Records</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Right Column: High-Fidelity Domain Visual */}
        <div className="lg:col-span-5 relative">
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl group">
            <img
              src={heroImg}
              alt="AI Loan Underwriting & Banking Analytics"
              referrerPolicy="no-referrer"
              className="w-full h-56 sm:h-64 object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
            />
            {/* Scrim Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
              <div className="text-xs text-slate-200">
                <span className="font-semibold text-white">Autonomous BFSI Engine</span>
                <span className="text-slate-400 block text-[11px]">
                  Institutional Debt Multipliers & Bureau Models
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] font-mono font-medium text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>ONLINE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
