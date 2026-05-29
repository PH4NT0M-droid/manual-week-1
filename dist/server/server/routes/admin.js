import { Router } from 'express';
import { closeRoundTimer, endRoundState, startRoundState } from '../services/gameState.js';
import { appendRoundResultRows, readLeaderboardRows, readSheetRows } from '../services/sheets.js';
import { buildLeaderboard, buildRoundCloseRow } from '../services/trading.js';
export const adminRouter = Router();
adminRouter.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true });
        return;
    }
    res.json({ success: false });
});
adminRouter.post('/start-round', (req, res) => {
    const { imageUrl, correctDirection, newPrice, round } = req.body;
    const state = startRoundState({
        round: Number(round) || 0,
        imageUrl: imageUrl ?? '',
        correctDirection: correctDirection ?? '',
        newPrice: Number(newPrice) || 0
    });
    setTimeout(() => {
        closeRoundTimer();
    }, 30000);
    res.json({ success: true, gameState: state });
});
adminRouter.post('/end-round', async (req, res) => {
    const { newPrice } = req.body;
    const resolvedPrice = Number(newPrice) || 0;
    endRoundState(resolvedPrice);
    const rows = await readSheetRows();
    const updates = [];
    for (let index = 1; index < rows.length; index += 1) {
        const row = rows[index];
        if (!row) {
            continue;
        }
        const updatedRow = buildRoundCloseRow(row, resolvedPrice);
        if (updatedRow !== row) {
            updates.push({ rowIndex: index + 1, row: updatedRow });
        }
    }
    await appendRoundResultRows(updates);
    res.json({ success: true, newPrice: resolvedPrice });
});
adminRouter.get('/leaderboard', async (_req, res) => {
    const board = buildLeaderboard(await readLeaderboardRows());
    res.json(board);
});
