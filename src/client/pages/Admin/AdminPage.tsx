import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { endRound, fetchAdminLeaderboard, loginAdmin, startRound } from '@client/services/adminApi';
import { useInterval } from '@client/hooks/useInterval';
import type { LeaderboardEntry, GameState } from '@shared/types';

const initialGameState: GameState = {
  currentRound: 0,
  timerActive: false,
  timerSeconds: 30,
  currentImage: '',
  currentPrice: 1000,
  correctDirection: '',
  gameActive: false
};

export function AdminPage(): ReactElement {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roundNumber, setRoundNumber] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [correctDirection, setCorrectDirection] = useState('');
  const [endPrice, setEndPrice] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');

  async function handleLogin(): Promise<void> {
    const result = await loginAdmin(password);
    if (result.success) {
      setAuthenticated(true);
    } else {
      window.alert('Wrong password');
    }
  }

  async function handleStartRound(): Promise<void> {
    if (!roundNumber || !imageUrl || !newPrice || !correctDirection) {
      window.alert('Fill all fields');
      return;
    }

    const result = await startRound({
      round: Number(roundNumber),
      imageUrl,
      newPrice: Number(newPrice),
      correctDirection
    });

    if (result.success) {
      setGameState(result.gameState);
      setCorrectAnswer('');
      window.alert(`Round ${roundNumber} started! Timer running for 30 seconds.`);
    }
  }

  async function handleEndRound(): Promise<void> {
    if (!endPrice) {
      window.alert('Enter new price');
      return;
    }

    const result = await endRound(Number(endPrice));
    if (result.success) {
      const state = await fetch('/api/game-state').then((response) => response.json() as Promise<GameState>);
      setGameState(state);
      setCorrectAnswer(`✅ Correct Answer: ${state.correctDirection} | New Price: ₹${Number(endPrice)}`);
      window.alert('Round ended. PnL calculated for all participants.');
    }
  }

  useInterval(async () => {
    if (!authenticated) {
      return;
    }

    const state = await fetch('/api/game-state').then((response) => response.json() as Promise<GameState>);
    setGameState(state);
  }, authenticated ? 2000 : null);

  useInterval(async () => {
    if (!authenticated) {
      return;
    }

    setLeaderboard(await fetchAdminLeaderboard());
  }, authenticated ? 4000 : null);

  const statusText = useMemo(() => {
    return `Round: ${gameState.currentRound} | Price: ₹${gameState.currentPrice} | Timer: ${gameState.timerActive ? 'ACTIVE' : 'Inactive'}`;
  }, [gameState]);

  if (!authenticated) {
    return (
      <div id="login-screen" className="login-screen">
        <h1>🔐 Admin Panel</h1>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter password"
          style={{
            width: '100%',
            maxWidth: '320px',
            background: '#1a1a1a',
            border: '1px solid #444',
            color: '#fff',
            padding: '16px',
            borderRadius: '10px',
            fontSize: '18px',
            marginBottom: '16px'
          }}
        />
        <button className="btn-submit" onClick={handleLogin} style={{ maxWidth: '320px', width: '100%' }}>
          Login
        </button>
      </div>
    );
  }

  return (
    <div id="admin-screen">
      <div className="container" style={{ maxWidth: '600px' }}>
        <h1 style={{ marginBottom: '20px', color: '#00ff88' }}>⚡ Admin Panel</h1>
        <div className="admin-panel">
          <h2>Game Status</h2>
          <div id="status-display" style={{ color: '#aaa' }}>
            {statusText}
          </div>
        </div>
        <div className="admin-panel">
          <h2>Start New Round</h2>
          <input type="number" value={roundNumber} onChange={(event) => setRoundNumber(event.target.value)} placeholder="Round number (1-15)" />
          <input type="text" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Image URL (upload to imgbb.com first)" />
          <input type="number" value={newPrice} onChange={(event) => setNewPrice(event.target.value)} placeholder="Asset price for this round" />
          <select value={correctDirection} onChange={(event) => setCorrectDirection(event.target.value)}>
            <option value="">Correct direction (for reveal)</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
            <option value="HOLD">HOLD</option>
          </select>
          <button className="btn-admin" onClick={handleStartRound}>
            🚀 Drop Bulletin & Start Timer
          </button>
        </div>
        <div className="admin-panel">
          <h2>End Round</h2>
          <input type="number" value={endPrice} onChange={(event) => setEndPrice(event.target.value)} placeholder="New price after round" />
          <button className="btn-admin btn-danger" onClick={handleEndRound}>
            🔴 End Round & Calculate PnL
          </button>
          <div id="correct-answer-display" style={{ marginTop: '10px', color: '#00ff88', fontSize: '18px', fontWeight: 700 }}>
            {correctAnswer}
          </div>
        </div>
        <div className="admin-panel">
          <h2>Live Submissions</h2>
          <div id="submissions-display" style={{ color: '#aaa' }}>
            {leaderboard.length === 0 ? (
              'No participants yet'
            ) : (
              <table className="submissions-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Balance</th>
                    <th>Total PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.name}>
                      <td>{entry.name}</td>
                      <td>₹{Math.round(entry.cashBalance).toLocaleString()}</td>
                      <td style={{ color: entry.totalPnl >= 0 ? '#00ff88' : '#ff4444' }}>
                        {entry.totalPnl >= 0 ? '+' : ''}₹{Math.round(entry.totalPnl).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
