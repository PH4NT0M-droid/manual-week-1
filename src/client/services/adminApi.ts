import { fetchJson } from './http';
import type { GameState, LeaderboardEntry } from '@shared/types';

export async function loginAdmin(password: string): Promise<{ success: boolean }> {
  return fetchJson('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
}

export async function startRound(payload: {
  round: number;
  imageUrl: string;
  newPrice: number;
  correctDirection: string;
}): Promise<{ success: boolean; gameState: GameState }> {
  return fetchJson('/api/admin/start-round', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function endRound(newPrice: number): Promise<{ success: boolean; newPrice: number }> {
  return fetchJson('/api/admin/end-round', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPrice })
  });
}

export async function fetchAdminLeaderboard(): Promise<LeaderboardEntry[]> {
  return fetchJson('/api/leaderboard');
}
