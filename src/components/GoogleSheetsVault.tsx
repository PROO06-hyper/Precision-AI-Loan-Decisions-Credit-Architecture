import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { SyncedAssessmentRecord, CurrencyConfig } from '../types';
import {
  GoogleSheetMeta,
  getStoredSpreadsheetMeta,
  setStoredSpreadsheetMeta,
  createBfsiSpreadsheet,
  fetchRecentRecords,
} from '../services/googleSheets';
import { getCachedAccessToken } from '../services/firebaseAuth';
import { ConfirmationModal } from './ConfirmationModal';
import {
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Link as LinkIcon,
} from 'lucide-react';

interface Props {
  user: User | null;
  records: SyncedAssessmentRecord[];
  onClearRecords: () => void;
  onRequestGoogleAuth: () => void;
  currency: CurrencyConfig;
}

export const GoogleSheetsVault: React.FC<Props> = ({
  user,
  records,
  onClearRecords,
  onRequestGoogleAuth,
}) => {
  const [sheetMeta, setSheetMeta] = useState<GoogleSheetMeta | null>(null);
  const [isCreatingSheet, setIsCreatingSheet] = useState<boolean>(false);
  const [isFetchingSheetRows, setIsFetchingSheetRows] = useState<boolean>(false);
  const [activeSheetTab, setActiveSheetTab] = useState<'Loan_Eligibility' | 'Credit_Profiles' | 'EMI_Schedules'>('Loan_Eligibility');
  const [sheetRows, setSheetRows] = useState<string[][]>([]);
  const [manualSheetId, setManualSheetId] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const meta = getStoredSpreadsheetMeta();
    if (meta) {
      setSheetMeta(meta);
    }
  }, []);

  // Fetch live rows from Google Sheet when sheetMeta or tab changes
  useEffect(() => {
    if (sheetMeta?.spreadsheetId && user) {
      loadSheetRows();
    }
  }, [sheetMeta, activeSheetTab, user]);

  const loadSheetRows = async () => {
    const token = getCachedAccessToken();
    if (!token || !sheetMeta?.spreadsheetId) return;

    setIsFetchingSheetRows(true);
    try {
      const rows = await fetchRecentRecords(sheetMeta.spreadsheetId, activeSheetTab, token);
      setSheetRows(rows);
    } catch (e) {
      console.warn('Could not read rows from Google Sheet:', e);
    } finally {
      setIsFetchingSheetRows(false);
    }
  };

  const handleCreateSheetPrompt = () => {
    if (!user) {
      onRequestGoogleAuth();
      return;
    }

    setModalConfig({
      isOpen: true,
      title: 'Create Google Spreadsheet',
      message:
        'This will create a new dedicated spreadsheet titled "BFSI AI Loan Portfolio & Financial Records" in your Google Drive with formatted tabs for Loan Eligibility, Credit Scores, and EMI projections.',
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        await executeCreateSpreadsheet();
      },
    });
  };

  const executeCreateSpreadsheet = async () => {
    const token = getCachedAccessToken();
    if (!token) {
      onRequestGoogleAuth();
      return;
    }

    setIsCreatingSheet(true);
    try {
      const meta = await createBfsiSpreadsheet(token);
      setSheetMeta(meta);
      loadSheetRows();
    } catch (err: any) {
      alert(`Error creating Google Sheet: ${err.message}`);
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleConnectManualSheet = () => {
    if (!manualSheetId.trim()) return;

    let id = manualSheetId.trim();
    if (id.includes('/d/')) {
      const parts = id.split('/d/');
      id = parts[1].split('/')[0];
    }

    const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;
    setStoredSpreadsheetMeta(id, url);
    setSheetMeta({
      spreadsheetId: id,
      spreadsheetUrl: url,
      title: 'Connected Google Sheet',
    });
    setShowManualInput(false);
    setManualSheetId('');
  };

  const handleClearRecordsPrompt = () => {
    setModalConfig({
      isOpen: true,
      title: 'Clear Local Assessment History',
      message:
        'Are you sure you want to clear your local session calculation history? This will not delete any rows already saved to your Google Sheet.',
      onConfirm: () => {
        onClearRecords();
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="h-4 w-4" />
            </span>
            Google Sheets Cloud Vault & Audit Logs
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Persist and synchronize all loan underwriting verdicts, credit health checks, and EMI
            schedules into your personal Google Sheets.
          </p>
        </div>

        {sheetMeta && (
          <a
            href={sheetMeta.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 transition-all self-start sm:self-auto"
          >
            <span>Open in Google Sheets</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* Connection & Setup Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Google Authentication Status</div>
              <div className="text-sm font-semibold text-white">
                {user ? user.email : 'Not Connected'}
              </div>
            </div>
          </div>

          {!user ? (
            <button
              onClick={onRequestGoogleAuth}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              Sign In with Google
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Authorized</span>
              </span>
            </div>
          )}
        </div>

        {/* Active Spreadsheet Status */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Connected Google Sheet
              </span>
              <div className="text-sm font-semibold text-white mt-0.5">
                {sheetMeta ? sheetMeta.title : 'No active spreadsheet configured'}
              </div>
              {sheetMeta && (
                <div className="text-[11px] font-mono text-slate-500 truncate max-w-md">
                  ID: {sheetMeta.spreadsheetId}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {sheetMeta ? (
                <button
                  onClick={loadSheetRows}
                  disabled={isFetchingSheetRows}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${isFetchingSheetRows ? 'animate-spin' : ''}`} />
                  <span>Refresh Rows</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateSheetPrompt}
                    disabled={isCreatingSheet}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{isCreatingSheet ? 'Creating Sheet...' : 'Create Dedicated Sheet'}</span>
                  </button>
                  <button
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>Connect Existing</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Manual Sheet ID Input */}
          {showManualInput && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                Paste existing Google Spreadsheet ID or URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualSheetId}
                  onChange={(e) => setManualSheetId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/... or ID"
                  className="glass-input flex-1 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  onClick={handleConnectManualSheet}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
                >
                  Connect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Rows from Google Sheets Viewer */}
      {sheetMeta && (
        <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              <span>Live Google Sheet Rows</span>
            </h3>

            {/* Tab switcher for worksheets */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveSheetTab('Loan_Eligibility')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeSheetTab === 'Loan_Eligibility'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Loan Eligibility
              </button>
              <button
                onClick={() => setActiveSheetTab('Credit_Profiles')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeSheetTab === 'Credit_Profiles'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Credit Profiles
              </button>
              <button
                onClick={() => setActiveSheetTab('EMI_Schedules')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeSheetTab === 'EMI_Schedules'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EMI Schedules
              </button>
            </div>
          </div>

          {isFetchingSheetRows ? (
            <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
              <span>Loading rows from Google Sheets...</span>
            </div>
          ) : sheetRows.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No rows recorded in this sheet tab yet. Use the Loan, Credit, or EMI tools to save
              records.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                  {sheetRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={`hover:bg-slate-900/40 ${
                        rIdx === 0 ? 'bg-slate-950/60 font-semibold text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {row.map((col, cIdx) => (
                        <td key={cIdx} className="py-2 px-3 whitespace-nowrap">
                          {col}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Local Session Audit Trail */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Recent Calculations & Session Logs ({records.length})
            </h3>
          </div>

          {records.length > 0 && (
            <button
              onClick={handleClearRecordsPrompt}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {records.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No calculations recorded in this browser session yet. Run any of the financial tools to
            log calculations.
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{rec.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      · {rec.timestamp}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      rec.syncedToGoogleSheets
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {rec.syncedToGoogleSheets ? '✓ Synced to Sheets' : 'Local Only'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 font-mono tabular-nums">
                  {Object.entries(rec.primaryMetrics).map(([key, val]) => (
                    <span key={key}>
                      <span className="text-slate-500">{key}:</span> {val}
                    </span>
                  ))}
                </div>

                {rec.aiVerdict && (
                  <div className="text-[11px] text-emerald-400 font-medium pt-1">
                    AI Underwriting Result: {rec.aiVerdict}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
