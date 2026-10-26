import React, { useState, useMemo } from 'react';
import {
  CurrencyConfig,
  LoanInputState,
  LoanType,
  EmploymentType,
  LoanUnderwritingAnalysis,
} from '../types';
import { analyzeLoanEligibilityWithAi } from '../services/aiApi';
import { appendRecordToSheet, getStoredSpreadsheetMeta } from '../services/googleSheets';
import { getCachedAccessToken } from '../services/firebaseAuth';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface Props {
  currency: CurrencyConfig;
  onRecordSaved: (record: any) => void;
  onRequestGoogleAuth: () => void;
  isAuthenticated: boolean;
}

const DEFAULT_LOAN_STATE: LoanInputState = {
  monthlyIncome: 7500,
  existingEmi: 850,
  requestedAmount: 180000,
  tenureYears: 15,
  loanType: 'Home Loan / Mortgage',
  employmentType: 'Salaried (MNC / Tier-1)',
  creditScoreEstimate: 745,
  coApplicantIncome: 2500,
};

export const LoanEligibilityChecker: React.FC<Props> = ({
  currency,
  onRecordSaved,
  onRequestGoogleAuth,
  isAuthenticated,
}) => {
  const [inputs, setInputs] = useState<LoanInputState>(DEFAULT_LOAN_STATE);
  const [includeCoApplicant, setIncludeCoApplicant] = useState<boolean>(true);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<LoanUnderwritingAnalysis | null>(null);
  const [isSavingToSheet, setIsSavingToSheet] = useState<boolean>(false);
  const [sheetSaveStatus, setSheetSaveStatus] = useState<string | null>(null);

  // Dynamic Interest Rate based on Loan Type & Credit Score
  const estimatedInterestRate = useMemo(() => {
    let baseRate = 7.5;
    if (inputs.loanType === 'Home Loan / Mortgage') baseRate = 6.8;
    else if (inputs.loanType === 'Personal Loan') baseRate = 10.9;
    else if (inputs.loanType === 'Auto Loan') baseRate = 7.9;
    else if (inputs.loanType === 'Business Loan') baseRate = 11.5;
    else if (inputs.loanType === 'Education Loan') baseRate = 8.5;

    // Credit score adjustment
    if (inputs.creditScoreEstimate >= 780) baseRate -= 0.5;
    else if (inputs.creditScoreEstimate >= 720) baseRate -= 0.2;
    else if (inputs.creditScoreEstimate < 650) baseRate += 1.8;
    else if (inputs.creditScoreEstimate < 700) baseRate += 0.8;

    return Math.max(5.5, Number(baseRate.toFixed(2)));
  }, [inputs.loanType, inputs.creditScoreEstimate]);

  // Mathematical Underwriting Engine
  const underwritingMath = useMemo(() => {
    const effectiveIncome =
      inputs.monthlyIncome + (includeCoApplicant ? inputs.coApplicantIncome : 0);

    // Max FOIR benchmark by loan type
    let maxFoirLimit = 0.5; // 50%
    if (inputs.loanType === 'Home Loan / Mortgage') maxFoirLimit = 0.6; // 60%
    else if (inputs.loanType === 'Personal Loan') maxFoirLimit = 0.45; // 45%

    const maxAllowableTotalEmi = effectiveIncome * maxFoirLimit;
    const availableMonthlyEmiCapacity = Math.max(0, maxAllowableTotalEmi - inputs.existingEmi);

    // Monthly interest factor
    const monthlyRate = estimatedInterestRate / 100 / 12;
    const totalMonths = inputs.tenureYears * 12;

    // Monthly EMI of requested loan
    const reqAmount = inputs.requestedAmount;
    let requestedEmi = 0;
    if (monthlyRate > 0) {
      requestedEmi =
        (reqAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1);
    } else {
      requestedEmi = reqAmount / totalMonths;
    }

    // Maximum Loan Amount possible with available EMI capacity
    let maxLoanCapacity = 0;
    if (monthlyRate > 0) {
      maxLoanCapacity =
        (availableMonthlyEmiCapacity * (Math.pow(1 + monthlyRate, totalMonths) - 1)) /
        (monthlyRate * Math.pow(1 + monthlyRate, totalMonths));
    } else {
      maxLoanCapacity = availableMonthlyEmiCapacity * totalMonths;
    }

    // FOIR with requested loan
    const projectedTotalEmi = inputs.existingEmi + requestedEmi;
    const foirPct = effectiveIncome > 0 ? (projectedTotalEmi / effectiveIncome) * 100 : 100;

    // Approval Chance Algorithm
    let approvalChance = 85;
    if (foirPct > maxFoirLimit * 100) {
      const overage = foirPct - maxFoirLimit * 100;
      approvalChance -= overage * 2.5;
    }
    if (inputs.creditScoreEstimate < 650) approvalChance -= 30;
    else if (inputs.creditScoreEstimate < 700) approvalChance -= 15;
    else if (inputs.creditScoreEstimate >= 760) approvalChance += 10;

    approvalChance = Math.min(98, Math.max(15, Math.round(approvalChance)));

    let verdict: 'Eligible' | 'Conditional' | 'Borderline' | 'High Risk' = 'Eligible';
    if (approvalChance >= 80) verdict = 'Eligible';
    else if (approvalChance >= 60) verdict = 'Conditional';
    else if (approvalChance >= 40) verdict = 'Borderline';
    else verdict = 'High Risk';

    return {
      effectiveIncome,
      requestedEmi: Math.round(requestedEmi),
      maxLoanCapacity: Math.round(maxLoanCapacity),
      availableMonthlyEmiCapacity: Math.round(availableMonthlyEmiCapacity),
      foirPct: Number(foirPct.toFixed(1)),
      approvalChance,
      verdict,
    };
  }, [inputs, includeCoApplicant, estimatedInterestRate]);

  // Handle AI Underwriting Diagnostic
  const handleRunAiAnalysis = async () => {
    setIsAnalyzingAi(true);
    try {
      const analysis = await analyzeLoanEligibilityWithAi({
        monthlyIncome: inputs.monthlyIncome,
        existingEmi: inputs.existingEmi,
        loanAmountRequested: inputs.requestedAmount,
        tenureYears: inputs.tenureYears,
        loanType: inputs.loanType,
        employmentType: inputs.employmentType,
        creditScoreEstimate: inputs.creditScoreEstimate,
        coApplicantIncome: includeCoApplicant ? inputs.coApplicantIncome : 0,
        currencySymbol: currency.symbol,
        calculatedFoir: underwritingMath.foirPct,
        calculatedMaxLoan: underwritingMath.maxLoanCapacity,
        calculatedApprovalChance: underwritingMath.approvalChance,
      });
      setAiReport(analysis);
    } catch (err: any) {
      alert(`AI Analysis error: ${err.message || 'Unable to connect to AI Underwriter'}`);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Sync to Google Sheets
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
      setSheetSaveStatus('No active Google Sheet configured. Please initialize your Sheets Vault.');
      return;
    }

    setIsSavingToSheet(true);
    setSheetSaveStatus(null);

    const timestamp = new Date().toLocaleString();
    const rowValues = [
      timestamp,
      inputs.loanType,
      inputs.employmentType,
      `${currency.symbol}${inputs.monthlyIncome}`,
      `${currency.symbol}${inputs.existingEmi}`,
      `${currency.symbol}${inputs.requestedAmount}`,
      inputs.tenureYears,
      inputs.creditScoreEstimate,
      `${underwritingMath.foirPct}%`,
      aiReport?.underwritingVerdict || underwritingMath.verdict,
      aiReport?.executiveSummary || 'Calculated via LoanSense Underwriting Engine',
    ];

    try {
      await appendRecordToSheet(
        sheetMeta.spreadsheetId,
        'Loan_Eligibility',
        rowValues,
        token
      );

      const savedRecord = {
        id: `loan_${Date.now()}`,
        type: 'Loan Eligibility',
        timestamp,
        title: `${inputs.loanType} - ${currency.symbol}${inputs.requestedAmount.toLocaleString()}`,
        currency: currency.code,
        primaryMetrics: {
          'Loan Amount': `${currency.symbol}${inputs.requestedAmount.toLocaleString()}`,
          'Tenure': `${inputs.tenureYears} Years`,
          'Estimated EMI': `${currency.symbol}${underwritingMath.requestedEmi.toLocaleString()}`,
          'FOIR / DTI': `${underwritingMath.foirPct}%`,
          'Approval Chance': `${underwritingMath.approvalChance}%`,
        },
        aiVerdict: aiReport?.underwritingVerdict || underwritingMath.verdict,
        syncedToGoogleSheets: true,
      };

      onRecordSaved(savedRecord);
      setSheetSaveStatus(`Saved row to "${sheetMeta.title}"!`);
    } catch (err: any) {
      console.error(err);
      setSheetSaveStatus(`Sheet sync failed: ${err.message}`);
    } finally {
      setIsSavingToSheet(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </span>
            AI Loan Eligibility & Underwriting Checker
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Simulate institutional banking credit guidelines, Fixed Obligation to Income Ratios
            (FOIR), and AI-driven risk scoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAiAnalysis}
            disabled={isAnalyzingAi}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 animate-spin-slow" />
            <span>{isAnalyzingAi ? 'Analyzing Underwriting...' : 'Run AI Analysis'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Inputs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Applicant Financial Profile
            </h3>

            {/* Income & Existing Debts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Monthly Net Income ({currency.symbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">
                    {currency.symbol}
                  </span>
                  <input
                    type="number"
                    value={inputs.monthlyIncome}
                    onChange={(e) =>
                      setInputs({ ...inputs, monthlyIncome: Math.max(0, Number(e.target.value)) })
                    }
                    className="glass-input w-full rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Existing Monthly Debts / EMIs ({currency.symbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">
                    {currency.symbol}
                  </span>
                  <input
                    type="number"
                    value={inputs.existingEmi}
                    onChange={(e) =>
                      setInputs({ ...inputs, existingEmi: Math.max(0, Number(e.target.value)) })
                    }
                    className="glass-input w-full rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Co-applicant toggle */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">
                  Add Co-Applicant / Co-Borrower Income
                </span>
                <input
                  type="checkbox"
                  checked={includeCoApplicant}
                  onChange={(e) => setIncludeCoApplicant(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
              </div>
              {includeCoApplicant && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Co-Applicant Net Monthly Income ({currency.symbol})
                  </label>
                  <input
                    type="number"
                    value={inputs.coApplicantIncome}
                    onChange={(e) =>
                      setInputs({
                        ...inputs,
                        coApplicantIncome: Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="glass-input w-full rounded-xl px-3 py-1.5 text-xs text-white font-mono tabular-nums"
                  />
                </div>
              )}
            </div>

            {/* Loan Category & Employment Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Loan Category
                </label>
                <select
                  value={inputs.loanType}
                  onChange={(e) => setInputs({ ...inputs, loanType: e.target.value as LoanType })}
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
                >
                  <option value="Home Loan / Mortgage" className="bg-slate-900">
                    Home Loan / Mortgage
                  </option>
                  <option value="Personal Loan" className="bg-slate-900">
                    Personal Loan
                  </option>
                  <option value="Auto Loan" className="bg-slate-900">
                    Auto Loan
                  </option>
                  <option value="Business Loan" className="bg-slate-900">
                    Business Loan
                  </option>
                  <option value="Education Loan" className="bg-slate-900">
                    Education Loan
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Employment Status
                </label>
                <select
                  value={inputs.employmentType}
                  onChange={(e) =>
                    setInputs({ ...inputs, employmentType: e.target.value as EmploymentType })
                  }
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
                >
                  <option value="Salaried (MNC / Tier-1)" className="bg-slate-900">
                    Salaried (MNC / Tier-1)
                  </option>
                  <option value="Salaried (Private / Public)" className="bg-slate-900">
                    Salaried (Private / Public)
                  </option>
                  <option value="Self-Employed Professional" className="bg-slate-900">
                    Self-Employed Professional
                  </option>
                  <option value="Business Owner" className="bg-slate-900">
                    Business Owner
                  </option>
                </select>
              </div>
            </div>

            {/* Requested Loan Amount & Tenure Slider */}
            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Requested Loan Amount
                  </label>
                  <span className="text-xs font-mono font-semibold text-emerald-400 tabular-nums">
                    {currency.symbol}
                    {inputs.requestedAmount.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={1000000}
                  step={5000}
                  value={inputs.requestedAmount}
                  onChange={(e) =>
                    setInputs({ ...inputs, requestedAmount: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Desired Tenure</label>
                  <span className="text-xs font-mono font-semibold text-emerald-400 tabular-nums">
                    {inputs.tenureYears} Years ({inputs.tenureYears * 12} Months)
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={inputs.tenureYears}
                  onChange={(e) =>
                    setInputs({ ...inputs, tenureYears: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Estimated Credit Score
                  </label>
                  <span className="text-xs font-mono font-semibold text-cyan-400 tabular-nums">
                    {inputs.creditScoreEstimate} FICO/CIBIL
                  </span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={850}
                  step={5}
                  value={inputs.creditScoreEstimate}
                  onChange={(e) =>
                    setInputs({ ...inputs, creditScoreEstimate: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Instant Underwriting Verdict & Metrics */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5 border-emerald-500/20 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Institutional Underwriting Summary
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  underwritingMath.verdict === 'Eligible'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : underwritingMath.verdict === 'Conditional'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {underwritingMath.verdict}
              </span>
            </div>

            {/* Approval Probability Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-slate-400">Approval Probability</span>
                <span className="font-mono font-bold text-white text-base tabular-nums">
                  {underwritingMath.approvalChance}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    underwritingMath.approvalChance >= 75
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : underwritingMath.approvalChance >= 50
                      ? 'bg-gradient-to-r from-cyan-500 to-amber-400'
                      : 'bg-gradient-to-r from-amber-500 to-rose-500'
                  }`}
                  style={{ width: `${underwritingMath.approvalChance}%` }}
                />
              </div>
            </div>

            {/* Core Underwriting Metric Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] text-slate-400 mb-0.5">Projected EMI</div>
                <div className="text-base font-bold font-mono text-white tabular-nums">
                  {currency.symbol}
                  {underwritingMath.requestedEmi.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">
                  @ {estimatedInterestRate}% APR
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] text-slate-400 mb-0.5">Max Loan Capacity</div>
                <div className="text-base font-bold font-mono text-emerald-400 tabular-nums">
                  {currency.symbol}
                  {underwritingMath.maxLoanCapacity.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">Based on debt limits</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] text-slate-400 mb-0.5">FOIR / DTI Ratio</div>
                <div
                  className={`text-base font-bold font-mono tabular-nums ${
                    underwritingMath.foirPct <= 50 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {underwritingMath.foirPct}%
                </div>
                <div className="text-[10px] text-slate-500">Benchmark: ≤ 50-60%</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] text-slate-400 mb-0.5">Available Capacity</div>
                <div className="text-base font-bold font-mono text-slate-200 tabular-nums">
                  {currency.symbol}
                  {underwritingMath.availableMonthlyEmiCapacity.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">Max EMI headroom</div>
              </div>
            </div>

            {/* Save to Google Sheets Action */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <button
                onClick={handleSaveToGoogleSheets}
                disabled={isSavingToSheet}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 px-4 text-xs font-semibold text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800 hover:text-white transition-all shadow-sm disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <span>
                  {isSavingToSheet
                    ? 'Syncing to Google Sheets...'
                    : 'Save Decision to Google Sheets'}
                </span>
              </button>

              {sheetSaveStatus && (
                <div className="text-[11px] text-center text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-2">
                  {sheetSaveStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Underwriter Report Section */}
      {aiReport && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-emerald-500/30 bg-gradient-to-b from-slate-900/80 to-slate-950">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">
                  Executive AI Underwriting Analysis
                </h3>
                <span className="text-xs text-slate-400">
                  Risk Assessment by Gemini 3.8 Flash Underwriting Engine
                </span>
              </div>
            </div>

            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 self-start sm:self-auto">
              Verdict: {aiReport.underwritingVerdict}
            </span>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            {aiReport.executiveSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Underwriting Strengths
              </h4>
              <ul className="space-y-2">
                {aiReport.strengths.map((str, i) => (
                  <li
                    key={i}
                    className="text-xs text-slate-300 bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-lg flex items-start gap-2"
                  >
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risk Factors */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Bank Risk Factors & Flags
              </h4>
              <ul className="space-y-2">
                {aiReport.riskFactors.map((risk, i) => (
                  <li
                    key={i}
                    className="text-xs text-slate-300 bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-lg flex items-start gap-2"
                  >
                    <span className="text-amber-400 font-bold">!</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Plan */}
          {aiReport.recommendedActionPlan && aiReport.recommendedActionPlan.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Strategic Steps to Maximize Approval & Lower Interest
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {aiReport.recommendedActionPlan.map((act, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1"
                  >
                    <div className="text-xs font-semibold text-white">{act.step}</div>
                    <div className="text-[11px] text-slate-400">{act.impact}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bank Negotiation Tip */}
          {aiReport.bankNegotiationTip && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 text-xs text-slate-300 flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-indigo-300 block mb-0.5">
                  Bank Negotiation & Rate Spread Strategy
                </span>
                {aiReport.bankNegotiationTip}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
