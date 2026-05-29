import { Router } from 'express';
import { gameState } from '../services/gameState.js';
import { appendParticipantRow, readSheetRows, updateSheetRow } from '../services/sheets.js';
import { buildOrderRow, validateUnits } from '../services/trading.js';
export const participantRouter = Router();
participantRouter.post('/register', async (req, res) => {
    const { name } = req.body;
    const id = `P${Date.now()}`;
    await appendParticipantRow([id, String(name ?? ''), 10000, 'FLAT', 0, 0, 0, 0, 'none']);
    res.json({ success: true, participantId: id, name, cashBalance: 10000 });
});
participantRouter.get('/game-state', (_req, res) => {
    res.json(gameState);
});
participantRouter.post('/order', async (req, res) => {
    const { participantId, direction, units } = req.body;
    const resolvedUnits = Number(units) || 0;
    if (!validateUnits(resolvedUnits)) {
        res.json({ success: false, message: 'Max 20 units allowed' });
        return;
    }
    if (!gameState.timerActive) {
        res.json({ success: false, message: 'Round closed' });
        return;
    }
    const rows = await readSheetRows();
    const rowIndex = rows.findIndex((row) => row[0] === participantId);
    if (rowIndex === -1) {
        res.json({ success: false, message: 'Participant not found' });
        return;
    }
    const participant = rows[rowIndex];
    if (!participant) {
        res.json({ success: false, message: 'Participant not found' });
        return;
    }
    const cashBalance = Number(participant[2]) || 0;
    const currentPrice = gameState.currentPrice;
    const orderValue = resolvedUnits * currentPrice;
    if (orderValue > cashBalance) {
        res.json({ success: false, message: 'Insufficient balance' });
        return;
    }
    const newCash = cashBalance - orderValue;
    const updatedRow = buildOrderRow(participant, newCash, String(direction ?? ''), resolvedUnits, currentPrice, gameState.currentRound);
    await updateSheetRow(rowIndex + 1, updatedRow);
    res.json({ success: true, newBalance: newCash });
});
