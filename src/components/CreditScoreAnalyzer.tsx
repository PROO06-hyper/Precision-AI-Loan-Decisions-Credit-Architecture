import React, { useState, useMemo } from 'react';
import { CurrencyConfig, CreditProfileInput, CreditAnalysisResult } from '../types';
import { analyzeCreditScoreWithAi } from '../services/aiApi';
import { appendRecordToSheet, getStoredSpreadsheetMeta } from '../services/googleSheets';
import { getCachedAccessToken } from '../services/firebaseAuth';
import {
  Gauge,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';

interface Props {
  currency: CurrencyConfig;
  onRecordSaved: (record: any) => void;
  onRequestGoogleAuth: () => void;
  isAuthenticated: boolean;
}

const DEFAULT_CREDIT_STATE: CreditProfileInput = {
  score: 715,
  paymentHistoryPct: 98,
  creditUtilizationPct: 28,
  creditAgeYears: 5.5,
  totalAccounts: 8,
  hardInquiries: 2,
};

export const CreditScoreAnalyzer: React.FC<Props> = ({
  currency,
  onRecordSaved,
  onRequestGoogleAuth,
  isAuthenticated,
}) => {
  const [profile, setProfile] = useState<CreditProfileInput>(DEFAULT_CREDIT_STATE);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<CreditAnalysisResult | null>(null);
  const [isSavingToSheet, setIsSavingToSheet] = useState<boolean>(false);
  const [sheetSaveStatus, setSheetSaveStatus] = useState<string | null>(null);

  // Score tier calculation
  const bureauTier = useMemo(() => {
    const s = profile.score;
    if (s >= 800) return { label: 'Exceptional (Tier 1)', color: 'text-emerald-400', risk: 'Lowest Risk' };
    if (s >= 740) return { label: 'Very Good (Prime)', color: 'text-teal-400', risk: 'Low Risk' };
    if (s >= 670) return { label: 'Good (Near Prime)', color: 'text-cyan-400', risk: 'Moderate Risk' };
    if (s >= 580) return { label: 'Fair (Subprime)', color: 'text-amber-400', risk: 'Elevated Risk' };
    return { label: 'Poor (High Risk)', color: 'text-rose-400', risk: 'High Risk' };
  }, [profile.score]);

  // Factor ratings
  const factorStatuses = useMemo(() => {
    const payment = profile.paymentHistoryPct >= 99 ? 'Optimal' : profile.paymentHistoryPct >= 95 ? 'Caution' : 'Critical';
    const util = profile.creditUtilizationPct <= 30 ? 'Optimal' : profile.creditUtilizationPct <= 50 ? 'Caution' : 'Critical';
    const age = profile.creditAgeYears >= 5 ? 'Optimal' : profile.creditAgeYears >= 2 ? 'Caution' : 'Critical';
    const inq = profile.hardInquiries <= 2 ? 'Optimal' : profile.hardInquiries <= 4 ? 'Caution' : 'Critical';
    return { payment, util, age, inq };
  }, [profile]);

  const handleRunAiAnalysis = async () => {
    setIsAnalyzingAi(true);
    try {
      const res = await analyzeCreditScoreWithAi({
        creditScore: profile.score,
        paymentHistoryPct: profile.paymentHistoryPct,
        creditUtilizationPct: profile.creditUtilizationPct,
        creditAgeYears: profile.creditAgeYears,
        totalAccounts: profile.totalAccounts,
        hardInquiries: profile.hardInquiries,
        currencySymbol: currency.symbol,
      });
      setAiReport(res);
    } catch (err: any) {
      alert(`AI Credit Diagnostic Error: ${err.message || 'Service unavailable'}`);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleSaveToGoogleSheets = async () => {
    if (!isAuthenticated) {
      onRequestGoogleAuth();
      return;
    }

    const token = getCachedAccessToken();
    if (!token) {
      onRequestGoogleAuth();
      return;
    }

    const sheetMeta = getStoredSpreadsheetMeta();
    if (!sheetMeta?.spreadsheetId) {
      setSheetSaveStatus('No active Google Sheet configured in Sheets Vault.');
      return;
    }

    setIsSavingToSheet(true);
    setSheetSaveStatus(null);

    const timestamp = new Date().toLocaleString();
    const rowValues = [
      timestamp,
      profile.score,
      bureauTier.label,
      `${profile.paymentHistoryPct}%`,
      `${profile.creditUtilizationPct}%`,
      profile.creditAgeYears,
      profile.hardInquiries,
      aiReport?.potentialScoreGainEstimate || '+25 to +40 pts',
      aiReport?.recoveryRoadmap?.day30Action || 'Maintain low utilization under 15%',
      aiReport?.topMistakeToAvoid || 'Do not close vintage credit cards',
    ];

    try {
      await appendRecordToSheet(sheetMeta.spreadsheetId, 'Credit_Profiles', rowValues, token);

      const record = {
        id: `credit_${Date.now()}`,
        type: 'Credit Analysis',
        timestamp,
        title: `Credit Score ${profile.score} (${bureauTier.label})`,
        currency: currency.code,
        primaryMetrics: {
          'Credit Score': profile.score,
          'Bureau Tier': bureauTier.label,
          'Utilization': `${profile.creditUtilizationPct}%`,
          'Payment History': `${profile.paymentHistoryPct}%`,
          'Credit Age': `${profile.creditAgeYears} yrs`,
        },
        aiVerdict: aiReport?.bureauTier || bureauTier.label,
        syncedToGoogleSheets: true,
      };

      onRecordSaved(record);
      setSheetSaveStatus(`Saved credit analysis to "${sheetMeta.title}"!`);
    } catch (err: any) {
      setSheetSaveStatus(`Save failed: ${err.message}`);
    } finally {
      setIsSavingToSheet(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Gauge className="h-4 w-4" />
            </span>
            Credit Score Diagnostic & Bureau Optimizer
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Simulate FICO and CIBIL algorithmic weighting, diagnose score bottlenecks, and get an
            actionable 90-day recovery blueprint.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAiAnalysis}
            disabled={isAnalyzingAi}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-950/40 hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 animate-spin-slow" />
            <span>{isAnalyzingAi ? 'Diagnosing Bureau Profile...' : 'Run Bureau AI Diagnostic'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Factor Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Credit Bureau Simulation Factors
            </h3>

            {/* Master Score Slider */}
            <div className="rounded-xl border border-cyan-500/30 bg-slate-950/60 p-4 space-y-3">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-medium text-slate-300">Target Credit Score</span>
                  <span className="text-[11px] text-slate-500 block">300 to 850 Bureau Range</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold font-mono text-cyan-400 tabular-nums">
                    {profile.score}
                  </span>
                  <span className={`block text-xs font-semibold ${bureauTier.color}`}>
                    {bureauTier.label}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={300}
                max={850}
                step={1}
                value={profile.score}
                onChange={(e) => setProfile({ ...profile, score: Number(e.target.value) })}
                className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer h-2.5"
              />
            </div>

            {/* 1. Payment History (35%) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  On-Time Payment History (35% Weight)
                </span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    factorStatuses.payment === 'Optimal'
                      ? 'text-emerald-400'
                      : factorStatuses.payment === 'Caution'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {profile.paymentHistoryPct}% ({factorStatuses.payment})
                </span>
              </div>
              <input
                type="range"
                min={70}
                max={100}
                step={1}
                value={profile.paymentHistoryPct}
                onChange={(e) =>
                  setProfile({ ...profile, paymentHistoryPct: Number(e.target.value) })
                }
                className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
              <span className="text-[11px] text-slate-500 block">
                Benchmark: 99% - 100% on-time record for tier-1 bank eligibility.
              </span>
            </div>

            {/* 2. Credit Utilization (30%) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  Revolving Credit Utilization (30% Weight)
                </span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    factorStatuses.util === 'Optimal'
                      ? 'text-emerald-400'
                      : factorStatuses.util === 'Caution'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {profile.creditUtilizationPct}% ({factorStatuses.util})
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={profile.creditUtilizationPct}
                onChange={(e) =>
                  setProfile({ ...profile, creditUtilizationPct: Number(e.target.value) })
                }
                className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
              <span className="text-[11px] text-slate-500 block">
                Rule of Thumb: Keeping revolving card balances &lt; 30% boosts score by 20-40 pts.
              </span>
            </div>

            {/* 3. Credit Age (15%) & Inquiries (10%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Average Credit Age</span>
                  <span className="font-mono text-cyan-400 font-semibold tabular-nums">
                    {profile.creditAgeYears} Yrs
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={profile.creditAgeYears}
                  onChange={(e) =>
                    setProfile({ ...profile, creditAgeYears: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Hard Inquiries (12m)</span>
                  <span className="font-mono text-cyan-400 font-semibold tabular-nums">
                    {profile.hardInquiries} Inquiries
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={profile.hardInquiries}
                  onChange={(e) =>
                    setProfile({ ...profile, hardInquiries: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Score Health Verdict & Google Sheets Sync */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5 border-cyan-500/20 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Bureau Profile Diagnostic
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 ${bureauTier.color}`}>
                {bureauTier.risk}
              </span>
            </div>

            {/* Score Ring / Bar */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center space-y-2">
              <div className="text-4xl font-extrabold font-mono text-white tabular-nums">
                {profile.score}
              </div>
              <div className="text-xs text-slate-400">
                Range: 300 - 850 · Status:{' '}
                <span className={`font-semibold ${bureauTier.color}`}>{bureauTier.label}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-3">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${((profile.score - 300) / 550) * 100}%` }}
                />
              </div>
            </div>

            {/* Factor Health Matrix */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Bureau Core Factor Status
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
                  <div className="text-[10px] text-slate-400">Payment History</div>
                  <div className="font-semibold text-white mt-0.5">{profile.paymentHistoryPct}%</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
                  <div className="text-[10px] text-slate-400">Card Utilization</div>
                  <div className="font-semibold text-white mt-0.5">{profile.creditUtilizationPct}%</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
                  <div className="text-[10px] text-slate-400">Credit Vintage</div>
                  <div className="font-semibold text-white mt-0.5">{profile.creditAgeYears} Yrs</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
                  <div className="text-[10px] text-slate-400">Recent Inquiries</div>
                  <div className="font-semibold text-white mt-0.5">{profile.hardInquiries} Inqs</div>
                </div>
              </div>
            </div>

            {/* Google Sheets Action */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <button
                onClick={handleSaveToGoogleSheets}
                disabled={isSavingToSheet}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 px-4 text-xs font-semibold text-slate-200 hover:border-cyan-500/50 hover:bg-slate-800 hover:text-white transition-all shadow-sm disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
                <span>
                  {isSavingToSheet
                    ? 'Syncing to Google Sheets...'
                    : 'Sync Credit Report to Google Sheets'}
                </span>
              </button>

              {sheetSaveStatus && (
                <div className="text-[11px] text-center text-cyan-300 bg-cyan-950/30 border border-cyan-800/40 rounded-lg p-2">
                  {sheetSaveStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Bureau Diagnostic Report */}
      {aiReport && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-cyan-500/30 bg-gradient-to-b from-slate-900/80 to-slate-950">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">
                  AI Credit Bureau Deep Diagnostic
                </h3>
                <span className="text-xs text-slate-400">
                  Algorithmic Score Recovery by Gemini 3.8 Flash
                </span>
              </div>
            </div>

            <div className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Potential Score Gain: {aiReport.potentialScoreGainEstimate}
            </div>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            {aiReport.scoreHealthDiagnosis}
          </p>

          {/* 30, 60, 90 Day Tactical Roadmap */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Actionable 90-Day Score Recovery Plan
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1">
                <div className="text-xs font-semibold text-emerald-400">Days 1 - 30</div>
                <p className="text-xs text-slate-300">{aiReport.recoveryRoadmap.day30Action}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1">
                <div className="text-xs font-semibold text-cyan-400">Days 31 - 60</div>
                <p className="text-xs text-slate-300">{aiReport.recoveryRoadmap.day60Action}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1">
                <div className="text-xs font-semibold text-indigo-400">Days 61 - 90</div>
                <p className="text-xs text-slate-300">{aiReport.recoveryRoadmap.day90Action}</p>
              </div>
            </div>
          </div>

          {/* Top Mistake to Avoid */}
          {aiReport.topMistakeToAvoid && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-slate-300 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-300 block mb-0.5">
                  Critical Pitfall to Avoid on this Profile
                </span>
                {aiReport.topMistakeToAvoid}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
