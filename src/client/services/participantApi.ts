import { fetchJson } from './http';
import type { GameState, LeaderboardEntry } from '@shared/types';

export async function registerParticipant(name: string): Promise<{ success: boolean; participantId: string; name: string; cashBalance: number }> {
  return fetchJson('/api/participant/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
}

export async function fetchGameState(): Promise<GameState> {
  return fetchJson('/api/game-state');
}

export async function submitParticipantOrder(payload: {
  participantId: string;
  direction: string;
  units: number;
}): Promise<{ success: boolean; newBalance?: number; message?: string }> {
  return fetchJson('/api/participant/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  return fetchJson('/api/leaderboard');
}
