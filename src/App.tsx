import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { CurrencyConfig, SUPPORTED_CURRENCIES, SyncedAssessmentRecord } from './types';
import { initAuth, signInWithGoogle, signOutUser } from './services/firebaseAuth';
import { getStoredSpreadsheetMeta } from './services/googleSheets';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { LoanEligibilityChecker } from './components/LoanEligibilityChecker';
import { CreditScoreAnalyzer } from './components/CreditScoreAnalyzer';
import { EmiCalculator } from './components/EmiCalculator';
import { AiFinancialTips } from './components/AiFinancialTips';
import { GoogleSheetsVault } from './components/GoogleSheetsVault';
import { ShieldCheck, Lock, ExternalLink } from 'lucide-react';

const LOCAL_STORAGE_RECORDS_KEY = 'bfsi_session_assessment_records';

export default function App() {
  const [activeTab, setActiveTab] = useState<'loan' | 'credit' | 'emi' | 'tips' | 'sheets'>('loan');
  const [currency, setCurrency] = useState<CurrencyConfig>(SUPPORTED_CURRENCIES[0]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [records, setRecords] = useState<SyncedAssessmentRecord[]>([]);
  const [hasConnectedSheet, setHasConnectedSheet] = useState<boolean>(false);

  // Initialize Auth & stored session records
  useEffect(() => {
    // Check stored records
    const storedRecs = localStorage.getItem(LOCAL_STORAGE_RECORDS_KEY);
    if (storedRecs) {
      try {
        setRecords(JSON.parse(storedRecs));
      } catch (e) {
        console.warn('Failed to parse stored records', e);
      }
    }

    // Check if user has an active sheet configured
    const meta = getStoredSpreadsheetMeta();
    if (meta?.spreadsheetId) {
      setHasConnectedSheet(true);
    }

    // Initialize Firebase auth state listener
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (currentUser) {
          const updatedMeta = getStoredSpreadsheetMeta();
          setHasConnectedSheet(!!updatedMeta?.spreadsheetId);
        }
      },
      () => {
        setUser(null);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const result = await signInWithGoogle();
      setUser(result.user);
      const meta = getStoredSpreadsheetMeta();
      setHasConnectedSheet(!!meta?.spreadsheetId);
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      alert(`Google Authentication: ${err.message || 'Could not sign in'}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
    } catch (e) {
      console.error('Sign out error', e);
    }
  };

  const handleRecordSaved = (newRecord: SyncedAssessmentRecord) => {
    setRecords((prev) => {
      const updated = [newRecord, ...prev];
      localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(updated));
      return updated;
    });
    const meta = getStoredSpreadsheetMeta();
    setHasConnectedSheet(!!meta?.spreadsheetId);
  };

  const handleClearRecords = () => {
    setRecords([]);
    localStorage.removeItem(LOCAL_STORAGE_RECORDS_KEY);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currency={currency}
        setCurrency={setCurrency}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isAuthenticating={isAuthenticating}
        hasConnectedSheet={hasConnectedSheet}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero Section */}
        <HeroBanner onSelectTab={(tab) => setActiveTab(tab)} currency={currency} />

        {/* Active Tool Tab View */}
        <div className="mt-2">
          {activeTab === 'loan' && (
            <LoanEligibilityChecker
              currency={currency}
              onRecordSaved={handleRecordSaved}
              onRequestGoogleAuth={handleSignIn}
              isAuthenticated={!!user}
            />
          )}

          {activeTab === 'credit' && (
            <CreditScoreAnalyzer
              currency={currency}
              onRecordSaved={handleRecordSaved}
              onRequestGoogleAuth={handleSignIn}
              isAuthenticated={!!user}
            />
          )}

          {activeTab === 'emi' && (
            <EmiCalculator
              currency={currency}
              onRecordSaved={handleRecordSaved}
              onRequestGoogleAuth={handleSignIn}
              isAuthenticated={!!user}
            />
          )}

          {activeTab === 'tips' && <AiFinancialTips currency={currency} />}

          {activeTab === 'sheets' && (
            <GoogleSheetsVault
              user={user}
              records={records}
              onClearRecords={handleClearRecords}
              onRequestGoogleAuth={handleSignIn}
              currency={currency}
            />
          )}
        </div>
      </main>

      {/* Clean Institutional Footer (Zero-Slop, No fake engine metrics) */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">LoanSense AI</span>
            <span>·</span>
            <span>BFSI Financial Decision Suite</span>
            <span>·</span>
            <span>Gemini 3.8 Flash & Google Sheets</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-emerald-400" />
              <span>Client-Side In-Memory OAuth Security</span>
            </span>
            <span>·</span>
            <span>Institutional Underwriting Models</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-3 text-[11px] text-slate-400">
          Disclaimer: Calculations, FOIR ratios, and credit score projections are intended for financial planning and educational decision support. Formal credit approvals are subject to official lender verification and underwriting criteria.
        </div>
      </footer>
    </div>
  );
}
