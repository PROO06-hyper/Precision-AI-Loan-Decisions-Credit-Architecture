import React from 'react';
import { User } from 'firebase/auth';
import { CurrencyConfig, SUPPORTED_CURRENCIES } from '../types';
import { Sparkles, FileSpreadsheet, ShieldCheck, LogOut, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'loan' | 'credit' | 'emi' | 'tips' | 'sheets';
  setActiveTab: (tab: 'loan' | 'credit' | 'emi' | 'tips' | 'sheets') => void;
  currency: CurrencyConfig;
  setCurrency: (c: CurrencyConfig) => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isAuthenticating: boolean;
  hasConnectedSheet: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currency,
  setCurrency,
  user,
  onSignIn,
  onSignOut,
  isAuthenticating,
  hasConnectedSheet,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single Text Element Wordmark */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <button
            onClick={() => setActiveTab('loan')}
            className="text-left font-bold tracking-tight text-white hover:text-emerald-400 transition-colors"
          >
            <span className="text-lg">LoanSense</span>
            <span className="text-emerald-400 text-lg">AI</span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <button
            onClick={() => setActiveTab('loan')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'loan'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            Loan Eligibility
          </button>
          <button
            onClick={() => setActiveTab('credit')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'credit'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            Credit Analyzer
          </button>
          <button
            onClick={() => setActiveTab('emi')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'emi'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            EMI Calculator
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'tips'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            AI Financial Tips
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'sheets'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Google Sheets</span>
            {hasConnectedSheet && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            )}
          </button>
        </nav>

        {/* Zone 3: Actions (Currency Selector & Google Account Auth) */}
        <div className="flex items-center gap-3">
          {/* Currency Selector */}
          <div className="relative">
            <select
              aria-label="Currency"
              value={currency.code}
              onChange={(e) => {
                const found = SUPPORTED_CURRENCIES.find((c) => c.code === e.target.value);
                if (found) setCurrency(found);
              }}
              className="glass-input cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-700 focus:outline-none"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-slate-900 text-slate-200">
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* Google Sign-in / User Pill */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('sheets')}
                title={user.email || 'Connected Google Account'}
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700 transition-colors"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="h-4 w-4 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                )}
                <span className="hidden sm:inline-block max-w-[100px] truncate">
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </button>
              <button
                onClick={onSignOut}
                title="Disconnect Google Account"
                className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:bg-slate-900 hover:text-rose-400 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              disabled={isAuthenticating}
              className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800 hover:text-white transition-all shadow-sm disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="whitespace-nowrap">
                {isAuthenticating ? 'Connecting...' : 'Connect Sheets'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex md:hidden overflow-x-auto border-t border-slate-800/60 px-3 py-2 gap-1.5 scrollbar-none">
        <button
          onClick={() => setActiveTab('loan')}
          className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
            activeTab === 'loan' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
          }`}
        >
          Eligibility
        </button>
        <button
          onClick={() => setActiveTab('credit')}
          className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
            activeTab === 'credit' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
          }`}
        >
          Credit Score
        </button>
        <button
          onClick={() => setActiveTab('emi')}
          className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
            activeTab === 'emi' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
          }`}
        >
          EMI Calc
        </button>
        <button
          onClick={() => setActiveTab('tips')}
          className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
            activeTab === 'tips' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
          }`}
        >
          AI Tips
        </button>
        <button
          onClick={() => setActiveTab('sheets')}
          className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap flex items-center gap-1 ${
            activeTab === 'sheets' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
          }`}
        >
          <FileSpreadsheet className="h-3 w-3" />
          Sheets Vault
        </button>
      </div>
    </header>
  );
};
