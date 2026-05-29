import { google } from 'googleapis';
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const SHEET_ID = process.env.SHEET_ID;
let sheetsClientPromise = null;
function getSheetId() {
    if (!SHEET_ID) {
        throw new Error('SHEET_ID is not configured');
    }
    return SHEET_ID;
}
async function getSheetsClient() {
    if (!sheetsClientPromise) {
        sheetsClientPromise = auth.getClient().then(() => {
            return google.sheets({ version: 'v4', auth });
        });
    }
    return sheetsClientPromise;
}
export async function appendParticipantRow(row) {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
        spreadsheetId: getSheetId(),
        range: 'Sheet1!A:I',
        valueInputOption: 'RAW',
        requestBody: { values: [row] }
    });
}
export async function readSheetRows() {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: getSheetId(),
        range: 'Sheet1!A:I'
    });
    return (response.data.values ?? []);
}
export async function updateSheetRow(rowIndex, row) {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.update({
        spreadsheetId: getSheetId(),
        range: `Sheet1!A${rowIndex}:I${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [row] }
    });
}
export async function appendRoundResultRows(rows) {
    const sheets = await getSheetsClient();
    for (const item of rows) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: getSheetId(),
            range: `Sheet1!A${item.rowIndex}:I${item.rowIndex}`,
            valueInputOption: 'RAW',
            requestBody: { values: [item.row] }
        });
    }
}
export async function readLeaderboardRows() {
    const rows = await readSheetRows();
    return rows.slice(1).map((row) => ({
        name: String(row[1] ?? ''),
        cashBalance: Number(row[2]) || 0,
        totalPnl: Number(row[6]) || 0
    }));
}
