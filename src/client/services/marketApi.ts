import { fetchJson } from './http';
import type { GameState } from '@shared/types';

export async function fetchMarketState(): Promise<GameState> {
  return fetchJson('/api/game-state');
}
