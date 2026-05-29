export type SheetRow = [
  string,
  string,
  number | string,
  string,
  number | string,
  number | string,
  number | string,
  number | string,
  string
];

export interface GameState {
  currentRound: number;
  timerActive: boolean;
  timerSeconds: number;
  currentImage: string;
  currentPrice: number;
  correctDirection: string;
  gameActive: boolean;
  prices?: Record<string, number>;
  roundResult?: {
    correctDirection: string;
    roundPnl: number;
    units: number;
  };
}

export interface LeaderboardEntry {
  name: string;
  cashBalance: number;
  totalPnl: number;
}

export interface ParticipantOrderResult {
  success: boolean;
  message?: string;
  newBalance?: number;
}
