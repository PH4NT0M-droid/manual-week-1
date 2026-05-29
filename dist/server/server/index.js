import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { adminRouter } from './routes/admin.js';
import { participantRouter } from './routes/participant.js';
import { validateEnv } from './config/env.js';
import { gameState } from './services/gameState.js';
import { readLeaderboardRows } from './services/sheets.js';
import { buildLeaderboard } from './services/trading.js';
dotenv.config();
validateEnv();
const app = express();
const clientRoot = existsSync(resolve(process.cwd(), 'dist')) ? resolve(process.cwd(), 'dist') : resolve(process.cwd(), 'public');
app.use(cors());
app.use(express.json());
app.use(express.static(clientRoot));
app.get('/', (_req, res) => {
    res.redirect('/participant');
});
app.use('/api/admin', adminRouter);
app.use('/api/participant', participantRouter);
app.get('/api/game-state', (_req, res) => {
    res.json(gameState);
});
app.get('/api/leaderboard', async (_req, res) => {
    const leaderboard = buildLeaderboard(await readLeaderboardRows());
    res.json(leaderboard);
});
app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
        next();
        return;
    }
    res.sendFile(resolve(clientRoot, 'index.html'));
});
export default app;
