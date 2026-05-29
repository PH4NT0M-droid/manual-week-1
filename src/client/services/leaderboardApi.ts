import { fetchJson } from './http';
import type { LeaderboardEntry } from '@shared/types';

export async function fetchLeaderboardState(): Promise<LeaderboardEntry[]> {
  return fetchJson('/api/leaderboard');
}
