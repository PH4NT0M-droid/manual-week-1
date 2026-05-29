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

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
