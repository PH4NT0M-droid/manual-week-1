import type { LeaderboardEntry, SheetRow } from '../types.js';

export function validateUnits(units: number): boolean {
  return Math.abs(units) <= 20;
}

export function calculateRoundPnl(direction: string, entryPrice: number, newPrice: number, units: number): number {
  if (direction === 'BUY') {
    return (newPrice - entryPrice) * units;
  }

  if (direction === 'SELL') {
    return (entryPrice - newPrice) * units;
  }

  return 0;
}

export function buildOrderRow(participant: SheetRow, newCash: number, direction: string, units: number, currentPrice: number, currentRound: number): SheetRow {
  return [
    participant[0],
    participant[1],
    newCash,
    direction,
    units,
    currentPrice,
    participant[6],
    currentRound,
    direction
  ];
}

export function buildLeaderboard(rows: Array<{ name: string; cashBalance: number; totalPnl: number }>): LeaderboardEntry[] {
  return rows.sort((a, b) => b.totalPnl - a.totalPnl);
}

export function buildRoundCloseRow(row: SheetRow, newPrice: number): SheetRow {
  const units = Number(row[4]) || 0;
  const entryPrice = Number(row[5]) || 0;
  const direction = String(row[3] ?? 'FLAT');
  const totalPnl = Number(row[6]) || 0;

  if (units === 0 || direction === 'FLAT') {
    return row;
  }

  const roundPnl = calculateRoundPnl(direction, entryPrice, newPrice, units);
  const newTotalPnl = totalPnl + roundPnl;
  const newCash = Number(row[2]) + units * newPrice;

  return [
    row[0],
    row[1],
    newCash,
    'FLAT',
    0,
    0,
    newTotalPnl,
    row[7],
    row[8]
  ];
}
