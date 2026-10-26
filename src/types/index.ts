export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)', locale: 'en-US' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', locale: 'en-IN' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', locale: 'en-GB' },
];

export type LoanType =
  | 'Personal Loan'
  | 'Home Loan / Mortgage'
  | 'Auto Loan'
  | 'Business Loan'
  | 'Education Loan';

export type EmploymentType =
  | 'Salaried (MNC / Tier-1)'
  | 'Salaried (Private / Public)'
  | 'Self-Employed Professional'
  | 'Business Owner';

export interface LoanInputState {
  monthlyIncome: number;
  existingEmi: number;
  requestedAmount: number;
  tenureYears: number;
  loanType: LoanType;
  employmentType: EmploymentType;
  creditScoreEstimate: number;
  coApplicantIncome: number;
}

export interface LoanCalculationOutput {
  foirPercentage: number;
  maxEligibleAmount: number;
  estimatedEmi: number;
  estimatedInterestRate: number;
  approvalProbability: number;
  statusVerdict: 'Eligible' | 'Conditional' | 'Borderline' | 'High Risk';
}

export interface LoanUnderwritingAnalysis {
  underwritingVerdict: 'Approved' | 'Conditional Approval' | 'High Risk / Caution' | 'Declined';
  executiveSummary: string;
  strengths: string[];
  riskFactors: string[];
  recommendedActionPlan: Array<{
    step: string;
    impact: string;
  }>;
  optimalLoanStructure: {
    recommendedAmount: number;
    recommendedTenureMonths: number;
    suggestedInterestRateRange: string;
    recommendedMaxEmi: number;
  };
  bankNegotiationTip: string;
}

export interface CreditProfileInput {
  score: number;
  paymentHistoryPct: number;
  creditUtilizationPct: number;
  creditAgeYears: number;
  totalAccounts: number;
  hardInquiries: number;
}

export interface CreditAnalysisResult {
  bureauTier: 'Exceptional' | 'Very Good' | 'Good' | 'Fair' | 'Poor';
  scoreHealthDiagnosis: string;
  factorBreakdown: Array<{
    factorName: string;
    status: 'Optimal' | 'Caution' | 'Critical';
    observation: string;
    targetBenchmark: string;
  }>;
  potentialScoreGainEstimate: string;
  recoveryRoadmap: {
    day30Action: string;
    day60Action: string;
    day90Action: string;
  };
  topMistakeToAvoid: string;
}

export interface AmortizationYear {
  year: number;
  beginningBalance: number;
  interestPaid: number;
  principalPaid: number;
  endingBalance: number;
}

export interface EmiCalculationOutput {
  principal: number;
  annualRate: number;
  tenureMonths: number;
  monthlyEmi: number;
  totalInterest: number;
  totalPayment: number;
  schedule: AmortizationYear[];
  extraMonthlyPayoff?: {
    extraMonthly: number;
    revisedTenureMonths: number;
    monthsSaved: number;
    interestSaved: number;
  };
}

export interface EmiOptimizationResult {
  interestToPrincipalRatio: string;
  verdictOnTenure: string;
  prepaymentStrategy: {
    recommendedPrepaymentType: string;
    estimatedSavingsInsight: string;
    breakevenTenureCutMonths: number;
  };
  taxAndDeductionGuidance: string;
  refinancingTrigger: string;
}

export interface FinancialTipItem {
  title: string;
  tagline: string;
  explanation: string;
  financialImpact: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
}

export interface FinancialTipsResponse {
  category: string;
  tips: FinancialTipItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SyncedAssessmentRecord {
  id: string;
  type: 'Loan Eligibility' | 'Credit Analysis' | 'EMI Plan';
  timestamp: string;
  title: string;
  currency: string;
  primaryMetrics: {
    [key: string]: string | number;
  };
  aiVerdict?: string;
  syncedToGoogleSheets: boolean;
}
