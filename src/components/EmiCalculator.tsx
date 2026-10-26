import React, { useState, useMemo } from 'react';
import { CurrencyConfig, EmiCalculationOutput, AmortizationYear, EmiOptimizationResult } from '../types';
import { optimizeEmiWithAi } from '../services/aiApi';
import { appendRecordToSheet, getStoredSpreadsheetMeta } from '../services/googleSheets';
import { getCachedAccessToken } from '../services/firebaseAuth';
import {
  Cpu,
  Sparkles,
  FileSpreadsheet,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Percent,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface Props {
  currency: CurrencyConfig;
  onRecordSaved: (record: any) => void;
  onRequestGoogleAuth: () => void;
  isAuthenticated: boolean;
}

export const EmiCalculator: React.FC<Props> = ({
  currency,
  onRecordSaved,
  onRequestGoogleAuth,
  isAuthenticated,
}) => {
  const [principal, setPrincipal] = useState<number>(250000);
  const [annualRate, setAnnualRate] = useState<number>(7.25);
  const [tenureYears, setTenureYears] = useState<number>(20);
  const [extraMonthly, setExtraMonthly] = useState<number>(150);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<EmiOptimizationResult | null>(null);
  const [isSavingToSheet, setIsSavingToSheet] = useState<boolean>(false);
  const [sheetSaveStatus, setSheetSaveStatus] = useState<string | null>(null);

  // Core EMI and Amortization Math
  const emiMath: EmiCalculationOutput = useMemo(() => {
    const P = principal;
    const r = annualRate / 100 / 12;
    const n = tenureYears * 12;

    let monthlyEmi = 0;
    if (r > 0 && n > 0) {
      monthlyEmi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    } else {
      monthlyEmi = P / n;
    }

    const totalPayment = monthlyEmi * n;
    const totalInterest = Math.max(0, totalPayment - P);

    // Build annual amortization schedule
    const schedule: AmortizationYear[] = [];
    let balance = P;

    for (let yr = 1; yr <= tenureYears; yr++) {
      const startBalance = balance;
      let interestThisYear = 0;
      let principalThisYear = 0;

      for (let m = 1; m <= 12; m++) {
        if (balance <= 0) break;
        const interestMonth = balance * r;
        const principalMonth = Math.min(balance, monthlyEmi - interestMonth);
        interestThisYear += interestMonth;
        principalThisYear += principalMonth;
        balance -= principalMonth;
      }

      schedule.push({
        year: yr,
        beginningBalance: Math.round(startBalance),
        interestPaid: Math.round(interestThisYear),
        principalPaid: Math.round(principalThisYear),
        endingBalance: Math.max(0, Math.round(balance)),
      });

      if (balance <= 0) break;
    }

    // Prepayment simulation (with extra monthly payment)
    let extraMonthlyPayoff;
    if (extraMonthly > 0) {
      let prepBalance = P;
      let prepMonths = 0;
      let prepTotalInterest = 0;
      const combinedMonthly = monthlyEmi + extraMonthly;

      while (prepBalance > 0 && prepMonths < n) {
        prepMonths++;
        const interest = prepBalance * r;
        prepTotalInterest += interest;
        const principalPaid = Math.min(prepBalance, combinedMonthly - interest);
        prepBalance -= principalPaid;
      }

      extraMonthlyPayoff = {
        extraMonthly,
        revisedTenureMonths: prepMonths,
        monthsSaved: Math.max(0, n - prepMonths),
        interestSaved: Math.max(0, Math.round(totalInterest - prepTotalInterest)),
      };
    }

    return {
      principal: P,
      annualRate,
      tenureMonths: n,
      monthlyEmi: Math.round(monthlyEmi),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment),
      schedule,
      extraMonthlyPayoff,
    };
  }, [principal, annualRate, tenureYears, extraMonthly]);

  // AI Optimization
  const handleRunAiOptimizer = async () => {
    setIsAnalyzingAi(true);
    try {
      const res = await optimizeEmiWithAi({
        loanAmount: principal,
        interestRate: annualRate,
        tenureMonths: tenureYears * 12,
        monthlyEmi: emiMath.monthlyEmi,
        totalInterest: emiMath.totalInterest,
        totalPayment: emiMath.totalPayment,
        prepaymentExtraMonthly: extraMonthly,
        currencySymbol: currency.symbol,
      });
      setAiReport(res);
    } catch (err: any) {
      alert(`AI Optimization error: ${err.message || 'Service unavailable'}`);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Google Sheets Sync
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
      `${currency.symbol}${principal.toLocaleString()}`,
      `${annualRate}%`,
      tenureYears * 12,
      `${currency.symbol}${emiMath.monthlyEmi.toLocaleString()}`,
      `${currency.symbol}${emiMath.totalInterest.toLocaleString()}`,
      `${currency.symbol}${emiMath.totalPayment.toLocaleString()}`,
      extraMonthly > 0 ? `${currency.symbol}${extraMonthly}/mo` : '$0',
      emiMath.extraMonthlyPayoff
        ? `${currency.symbol}${emiMath.extraMonthlyPayoff.interestSaved.toLocaleString()} (${(
            emiMath.extraMonthlyPayoff.monthsSaved / 12
          ).toFixed(1)} yrs cut)`
        : '$0',
    ];

    try {
      await appendRecordToSheet(sheetMeta.spreadsheetId, 'EMI_Schedules', rowValues, token);

      const record = {
        id: `emi_${Date.now()}`,
        type: 'EMI Plan',
        timestamp,
        title: `EMI Plan: ${currency.symbol}${principal.toLocaleString()} @ ${annualRate}%`,
        currency: currency.code,
        primaryMetrics: {
          'Loan Amount': `${currency.symbol}${principal.toLocaleString()}`,
          'Monthly EMI': `${currency.symbol}${emiMath.monthlyEmi.toLocaleString()}`,
          'Total Interest': `${currency.symbol}${emiMath.totalInterest.toLocaleString()}`,
          'Tenure': `${tenureYears} Years`,
          'Extra Payoff': `${currency.symbol}${extraMonthly}/mo`,
        },
        aiVerdict: aiReport?.verdictOnTenure || 'Amortization plan computed',
        syncedToGoogleSheets: true,
      };

      onRecordSaved(record);
      setSheetSaveStatus(`Saved EMI plan to "${sheetMeta.title}"!`);
    } catch (err: any) {
      setSheetSaveStatus(`Save failed: ${err.message}`);
    } finally {
      setIsSavingToSheet(false);
    }
  };

  const principalPct = Math.round((principal / emiMath.totalPayment) * 100);
  const interestPct = 100 - principalPct;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Cpu className="h-4 w-4" />
            </span>
            Precision EMI & Prepayment Amortization Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Simulate payment schedules, optimize interest-to-principal splits, and model tenure-cutting
            prepayments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAiOptimizer}
            disabled={isAnalyzingAi}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-950/40 hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 animate-spin-slow" />
            <span>{isAnalyzingAi ? 'Analyzing Amortization...' : 'Run AI Prepayment Optimizer'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Sliders */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Loan & Prepayment Parameters
            </h3>

            {/* Principal */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Principal Loan Amount</span>
                <span className="font-mono font-bold text-indigo-400 tabular-nums">
                  {currency.symbol}
                  {principal.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min={5000}
                max={1500000}
                step={5000}
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* Interest Rate */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Annual Interest Rate (APR)</span>
                <span className="font-mono font-bold text-indigo-400 tabular-nums">
                  {annualRate}%
                </span>
              </div>
              <input
                type="range"
                min={3.0}
                max={22.0}
                step={0.1}
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* Tenure */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Loan Term / Tenure</span>
                <span className="font-mono font-bold text-indigo-400 tabular-nums">
                  {tenureYears} Years ({tenureYears * 12} Months)
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* Extra Monthly Prepayment */}
            <div className="rounded-xl border border-indigo-500/30 bg-slate-950/60 p-4 space-y-3">
              <div className="flex justify-between text-xs">
                <div>
                  <span className="text-xs font-medium text-slate-200">
                    Extra Monthly Prepayment
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Accelerate amortization to reduce total interest
                  </span>
                </div>
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  +{currency.symbol}
                  {extraMonthly.toLocaleString()}/mo
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2000}
                step={25}
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(Number(e.target.value))}
                className="w-full accent-emerald-400 bg-slate-800 rounded-lg cursor-pointer h-2"
              />

              {emiMath.extraMonthlyPayoff && emiMath.extraMonthlyPayoff.interestSaved > 0 && (
                <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/40 p-3 text-xs text-emerald-300 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block">Prepayment Advantage:</span>
                    <span>
                      Saves {currency.symbol}
                      {emiMath.extraMonthlyPayoff.interestSaved.toLocaleString()} in interest
                    </span>
                  </div>
                  <div className="text-right font-mono font-bold">
                    -{(emiMath.extraMonthlyPayoff.monthsSaved / 12).toFixed(1)} Years
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Output Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5 border-indigo-500/20 shadow-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Monthly Payment & Totals
            </span>

            {/* Big EMI Highlight */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center space-y-1">
              <div className="text-xs text-slate-400">Monthly EMI</div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tabular-nums">
                {currency.symbol}
                {emiMath.monthlyEmi.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500">
                Principal + Interest per month
              </div>
            </div>

            {/* Principal vs Interest Distribution */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Principal ({principalPct}%)</span>
                <span>Interest ({interestPct}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${principalPct}%` }}
                />
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${interestPct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-[11px] text-slate-400">Total Interest Paid</div>
                <div className="text-sm font-bold font-mono text-amber-400 mt-0.5 tabular-nums">
                  {currency.symbol}
                  {emiMath.totalInterest.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-[11px] text-slate-400">Total Outflow (P+I)</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5 tabular-nums">
                  {currency.symbol}
                  {emiMath.totalPayment.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Google Sheets Sync */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <button
                onClick={handleSaveToGoogleSheets}
                disabled={isSavingToSheet}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 px-4 text-xs font-semibold text-slate-200 hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white transition-all shadow-sm disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
                <span>
                  {isSavingToSheet
                    ? 'Syncing to Google Sheets...'
                    : 'Sync EMI Schedule to Google Sheets'}
                </span>
              </button>

              {sheetSaveStatus && (
                <div className="text-[11px] text-center text-indigo-300 bg-indigo-950/30 border border-indigo-800/40 rounded-lg p-2">
                  {sheetSaveStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Prepayment & Amortization Report */}
      {aiReport && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-indigo-500/30 bg-gradient-to-b from-slate-900/80 to-slate-950">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">AI Amortization Strategy Report</h3>
              <span className="text-xs text-slate-400">
                Institutional Prepayment Analysis by Gemini 3.8 Flash
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-1.5">
              <div className="text-xs font-semibold text-indigo-400">Tenure Analysis</div>
              <p className="text-slate-300">{aiReport.verdictOnTenure}</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-1.5">
              <div className="text-xs font-semibold text-emerald-400">Optimal Prepayment Plan</div>
              <p className="text-slate-300">{aiReport.prepaymentStrategy.estimatedSavingsInsight}</p>
            </div>
          </div>

          {aiReport.taxAndDeductionGuidance && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300">
              <span className="font-semibold text-white block mb-1">
                Tax Shields & Deduction Advice:
              </span>
              {aiReport.taxAndDeductionGuidance}
            </div>
          )}
        </div>
      )}

      {/* Annual Amortization Table */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
          <span>Annual Amortization Schedule</span>
          <span className="text-xs font-normal text-slate-400">Year-by-Year Breakdown</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Year</th>
                <th className="py-2.5 px-3">Starting Balance</th>
                <th className="py-2.5 px-3">Principal Paid</th>
                <th className="py-2.5 px-3">Interest Paid</th>
                <th className="py-2.5 px-3">Ending Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
              {emiMath.schedule.slice(0, 10).map((row) => (
                <tr key={row.year} className="hover:bg-slate-900/40 text-slate-300">
                  <td className="py-2 px-3 font-semibold text-white">Year {row.year}</td>
                  <td className="py-2 px-3">
                    {currency.symbol}
                    {row.beginningBalance.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-indigo-400">
                    {currency.symbol}
                    {row.principalPaid.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-amber-400">
                    {currency.symbol}
                    {row.interestPaid.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-200">
                    {currency.symbol}
                    {row.endingBalance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {emiMath.schedule.length > 10 && (
            <div className="text-[11px] text-center text-slate-500 pt-3">
              Showing first 10 years of {tenureYears}-year schedule. Full schedule synced to Google Sheets.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
