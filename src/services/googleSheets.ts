export interface GoogleSheetMeta {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

const STORAGE_KEY_SHEET_ID = 'bfsi_active_spreadsheet_id';
const STORAGE_KEY_SHEET_URL = 'bfsi_active_spreadsheet_url';

export const getStoredSpreadsheetMeta = (): GoogleSheetMeta | null => {
  const id = localStorage.getItem(STORAGE_KEY_SHEET_ID);
  const url = localStorage.getItem(STORAGE_KEY_SHEET_URL);
  if (id && url) {
    return {
      spreadsheetId: id,
      spreadsheetUrl: url,
      title: 'BFSI AI Loan & Financial Records',
    };
  }
  return null;
};

export const setStoredSpreadsheetMeta = (id: string, url: string) => {
  localStorage.setItem(STORAGE_KEY_SHEET_ID, id);
  localStorage.setItem(STORAGE_KEY_SHEET_URL, url);
};

export const clearStoredSpreadsheetMeta = () => {
  localStorage.removeItem(STORAGE_KEY_SHEET_ID);
  localStorage.removeItem(STORAGE_KEY_SHEET_URL);
};

/**
 * Creates a new dedicated Google Spreadsheet with preset BFSI sheets and header columns
 */
export const createBfsiSpreadsheet = async (accessToken: string): Promise<GoogleSheetMeta> => {
  const title = `BFSI AI Loan Portfolio & Financial Records`;

  const payload = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Loan_Eligibility',
          gridProperties: { rowCount: 100, columnCount: 15 },
        },
      },
      {
        properties: {
          title: 'Credit_Profiles',
          gridProperties: { rowCount: 100, columnCount: 15 },
        },
      },
      {
        properties: {
          title: 'EMI_Schedules',
          gridProperties: { rowCount: 100, columnCount: 15 },
        },
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write headers to the 3 sheets
  await appendSheetHeaders(spreadsheetId, accessToken);

  setStoredSpreadsheetMeta(spreadsheetId, spreadsheetUrl);
  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
};

/**
 * Writes the header rows for all 3 sheets
 */
const appendSheetHeaders = async (spreadsheetId: string, accessToken: string) => {
  const headerData = [
    {
      range: 'Loan_Eligibility!A1:K1',
      values: [
        [
          'Timestamp',
          'Loan Type',
          'Employment Type',
          'Monthly Income',
          'Existing Obligations',
          'Requested Amount',
          'Tenure (Years)',
          'Credit Score',
          'FOIR / DTI %',
          'Underwriting Verdict',
          'AI Strategic Guidance',
        ],
      ],
    },
    {
      range: 'Credit_Profiles!A1:J1',
      values: [
        [
          'Timestamp',
          'Credit Score',
          'Bureau Tier',
          'Payment History %',
          'Credit Utilization %',
          'Credit Age (Yrs)',
          'Hard Inquiries',
          'Potential Gain (90d)',
          'Top Recovery Action',
          'Top Mistake to Avoid',
        ],
      ],
    },
    {
      range: 'EMI_Schedules!A1:I1',
      values: [
        [
          'Timestamp',
          'Loan Principal',
          'Interest Rate %',
          'Tenure (Months)',
          'Monthly EMI',
          'Total Interest',
          'Total Outflow',
          'Extra Monthly Payoff',
          'Interest Saved',
        ],
      ],
    },
  ];

  for (const item of headerData) {
    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          item.range
        )}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: item.values }),
        }
      );
    } catch (e) {
      console.warn('Failed setting header for', item.range, e);
    }
  }
};

/**
 * Appends a row to a specific sheet
 */
export const appendRecordToSheet = async (
  spreadsheetId: string,
  sheetName: 'Loan_Eligibility' | 'Credit_Profiles' | 'EMI_Schedules',
  rowValues: any[],
  accessToken: string
) => {
  const range = `${sheetName}!A:A`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets append error: ${errorText}`);
  }

  return response.json();
};

/**
 * Reads logged rows from a sheet
 */
export const fetchRecentRecords = async (
  spreadsheetId: string,
  sheetName: 'Loan_Eligibility' | 'Credit_Profiles' | 'EMI_Schedules',
  accessToken: string
) => {
  const range = `${sheetName}!A2:Z50`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch records from sheet ${sheetName}`);
  }

  const data = await response.json();
  return data.values || [];
};
