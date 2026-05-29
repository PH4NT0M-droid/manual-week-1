export function validateEnv() {
    const port = Number(process.env.PORT) || 3000;
    const sheetId = process.env.SHEET_ID;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!sheetId) {
        throw new Error('SHEET_ID is required');
    }
    if (!adminPassword) {
        throw new Error('ADMIN_PASSWORD is required');
    }
    return {
        PORT: port,
        SHEET_ID: sheetId,
        ADMIN_PASSWORD: adminPassword
    };
}
