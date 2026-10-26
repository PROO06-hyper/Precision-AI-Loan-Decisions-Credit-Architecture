import {
  LoanUnderwritingAnalysis,
  CreditAnalysisResult,
  EmiOptimizationResult,
  FinancialTipsResponse,
} from '../types';

export const analyzeLoanEligibilityWithAi = async (payload: {
  monthlyIncome: number;
  existingEmi: number;
  loanAmountRequested: number;
  tenureYears: number;
  loanType: string;
  employmentType: string;
  creditScoreEstimate: number;
  coApplicantIncome: number;
  currencySymbol: string;
  calculatedFoir: number;
  calculatedMaxLoan: number;
  calculatedApprovalChance: number;
}): Promise<LoanUnderwritingAnalysis> => {
  const response = await fetch('/api/ai/loan-eligibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to analyze loan eligibility');
  }

  const result = await response.json();
  return result.analysis;
};

export const analyzeCreditScoreWithAi = async (payload: {
  creditScore: number;
  paymentHistoryPct: number;
  creditUtilizationPct: number;
  creditAgeYears: number;
  totalAccounts: number;
  hardInquiries: number;
  currencySymbol: string;
}): Promise<CreditAnalysisResult> => {
  const response = await fetch('/api/ai/credit-analyzer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to analyze credit profile');
  }

  const result = await response.json();
  return result.analysis;
};

export const optimizeEmiWithAi = async (payload: {
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
  monthlyEmi: number;
  totalInterest: number;
  totalPayment: number;
  prepaymentExtraMonthly: number;
  currencySymbol: string;
}): Promise<EmiOptimizationResult> => {
  const response = await fetch('/api/ai/emi-optimizer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to optimize EMI amortization');
  }

  const result = await response.json();
  return result.analysis;
};

export const fetchAiFinancialTips = async (payload: {
  focusCategory: string;
  userProfileSummary?: string;
}): Promise<FinancialTipsResponse> => {
  const response = await fetch('/api/ai/financial-tips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to retrieve AI financial tips');
  }

  const result = await response.json();
  return result.data;
};

export const askFinancialAdvisorAi = async (payload: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  userContext: Record<string, any>;
}): Promise<string> => {
  const response = await fetch('/api/ai/advisor-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to consult financial advisor');
  }

  const result = await response.json();
  return result.message;
};
