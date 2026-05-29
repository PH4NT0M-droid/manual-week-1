import { useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { fetchGameState, fetchLeaderboard, registerParticipant, submitParticipantOrder } from '@client/services/participantApi';
import { useInterval } from '@client/hooks/useInterval';
import type { GameState, LeaderboardEntry } from '@shared/types';

const initialGameState: GameState = {
  currentRound: 0,
  timerActive: false,
  timerSeconds: 30,
  currentImage: '',
  currentPrice: 1000,
  correctDirection: '',
  gameActive: false
};

export function ParticipantPage(): ReactElement {
  const [name, setName] = useState('');
  const [registered, setRegistered] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [selectedDirection, setSelectedDirection] = useState('');
  const [units, setUnits] = useState(1);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusColor, setStatusColor] = useState('var(--dim)');
  const [cash, setCash] = useState(10000);
  const [showResult, setShowResult] = useState(false);
  const [resultPnl, setResultPnl] = useState(0);
  const [resultDetail, setResultDetail] = useState('');
  const [resultArrow, setResultArrow] = useState('—');
  const [timerSec, setTimerSec] = useState(0);
  const timerIdRef = useRef<number | null>(null);
  const lastTimerActiveRef = useRef(false);

  async function handleRegister(): Promise<void> {
    if (!name.trim()) {
      window.alert('Enter your name');
      return;
    }

    try {
      const response = await registerParticipant(name.trim());
      if (response.success) {
        setParticipantId(response.participantId);
        setRegistered(true);
      }
    } catch {
      window.alert('Cannot connect to server');
    }
  }

  async function handleSubmitOrder(): Promise<void> {
    if (!selectedDirection) {
      window.alert('Select BUY or SELL first');
      return;
    }

    if (units < 1 || units > 20) {
      window.alert('Units must be 1 to 20');
      return;
    }

    const result = await submitParticipantOrder({
      participantId,
      direction: selectedDirection,
      units
    });

    if (result.success) {
      const nextCash = result.newBalance ?? cash;
      setCash(nextCash);
      setStatusMessage(`${selectedDirection} ${units} units submitted successfully`);
      setStatusColor('var(--teal)');
    } else {
      setStatusMessage(result.message ?? 'Order failed');
      setStatusColor('var(--red)');
    }
  }

  function startTimer(seconds: number): void {
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
    }

    setTimerSec(seconds);
    timerIdRef.current = window.setInterval(() => {
      setTimerSec((currentSeconds) => {
        const next = currentSeconds - 1;
        if (next <= 0 && timerIdRef.current !== null) {
          window.clearInterval(timerIdRef.current);
        }
        return next;
      });
    }, 1000);
  }

  function stopTimer(): void {
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    setTimerSec(0);
  }

  function lockPanel(): void {
    setStatusMessage((currentMessage) => (currentMessage ? currentMessage : 'ROUND CLOSED'));
  }

  function resetPanel(): void {
    setSelectedDirection('');
    setUnits(1);
    setStatusMessage('');
    setStatusColor('var(--dim)');
  }

  function showRoundResult(direction: string, roundPnl: number, unitsTraded: number): void {
    setResultPnl(roundPnl);
    setResultArrow(direction === 'BUY' ? '▲' : direction === 'SELL' ? '▼' : '—');
    setResultDetail(`CORRECT ANSWER : ${direction}\nYOUR CALL      : ${selectedDirection || '—'}\nUNITS TRADED   : ${unitsTraded}`);
    setShowResult(true);
  }

  function orderCost(): string {
    return gameState.currentPrice && units ? `₹${(gameState.currentPrice * units).toLocaleString()}` : '₹ —';
  }

  const totalPnl = 0;
  const portfolioValue = useMemo(() => `₹${(cash + totalPnl).toLocaleString()}`, [cash]);

  useInterval(async () => {
    const state = await fetchGameState();
    setGameState(state);

    if (state.currentRound > 0) {
      // keep current round visible
    }

    if (state.prices) {
      // no-op placeholder, kept for compatibility with current client expectations
    }

    if (state.timerActive && !lastTimerActiveRef.current) {
      resetPanel();
      startTimer(30);
      if (state.currentImage) {
        const imageElement = document.getElementById('img-area');
        if (imageElement) {
          imageElement.innerHTML = `<img src="${state.currentImage}" alt="Round">`;
        }
      }
    }

    if (!state.timerActive && lastTimerActiveRef.current) {
      stopTimer();
      lockPanel();
      if (state.roundResult) {
        showRoundResult(state.roundResult.correctDirection, state.roundResult.roundPnl, state.roundResult.units);
      }
    }

    lastTimerActiveRef.current = state.timerActive;
  }, registered ? 2000 : null);

  useInterval(async () => {
    const board = await fetchLeaderboard();
    setLeaderboard(board);
  }, registered ? 5000 : null);

  if (!registered) {
    return (
      <div id="reg">
        <h1>QuantX</h1>
        <p>IIT BHU · THE QUANT CLUB · LIVE TRADING</p>
        <div className="rbox">
          <label>YOUR NAME</label>
          <input id="name-inp" type="text" placeholder="Enter your name" autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} />
          <button className="btn-go" onClick={handleRegister}>
            ENTER THE MARKET →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="app" style={{ display: 'flex' }}>
      <div className="topbar">
        <div>
          <div className="tq-logo">QuantX</div>
          <div className="tq-round" id="round-lbl">
            {gameState.currentRound > 0 ? `ROUND ${gameState.currentRound} / 15` : 'PRE-MARKET'}
          </div>
        </div>
        <div className="tq-portfolio">
          <div className="lbl">PORTFOLIO VALUE</div>
          <div className="val" id="portfolio-val">
            {portfolioValue}
          </div>
        </div>
      </div>

      <div className="ticker">
        <div className="tk"><div className="tk-name">AGW</div><div className="tk-price nt" id="t-agw">₹420</div><div className="tk-chg nt" id="tc-agw">—</div></div>
        <div className="tk"><div className="tk-name">NVT</div><div className="tk-price nt" id="t-nvt">₹1,240</div><div className="tk-chg nt" id="tc-nvt">—</div></div>
        <div className="tk"><div className="tk-name">SPK</div><div className="tk-price nt" id="t-spk">₹680</div><div className="tk-chg nt" id="tc-spk">—</div></div>
        <div className="tk"><div className="tk-name">CVT</div><div className="tk-price nt" id="t-cvt">₹4,200</div><div className="tk-chg nt" id="tc-cvt">—</div></div>
        <div className="tk"><div className="tk-name">MRI</div><div className="tk-price nt" id="t-mri">₹890</div><div className="tk-chg nt" id="tc-mri">—</div></div>
      </div>

      <div className="body">
        <div className="img-panel">
          <div className="img-header">
            <div className="img-tag">📰 MARKET BULLETIN</div>
            <div className="img-badge" id="round-badge">
              {gameState.currentRound > 0 ? `ROUND ${gameState.currentRound}` : 'PRE-MARKET'}
            </div>
          </div>
          <div className="img-area" id="img-area">
            {gameState.currentImage ? (
              <img src={gameState.currentImage} alt={`Round ${gameState.currentRound}`} />
            ) : (
              <div className="img-wait">
                <div className="blink" style={{ fontSize: 32, marginBottom: 14 }}>◉</div>
                <div>AWAITING NEXT ROUND...</div>
              </div>
            )}
          </div>
        </div>

        <div className="ctrl-panel">
          <div className="timer-block">
            <div className="timer-left">
              <div className="lbl">LIVE PRICE</div>
              <div className="price" id="live-price">
                ₹{gameState.currentPrice.toLocaleString()}
              </div>
            </div>
            <div className="timer-ring-wrap">
              <div className="timer-lbl">TIME LEFT</div>
              <div className="timer-ring">
                <svg width="86" height="86" viewBox="0 0 86 86">
                  <circle className="bg-circle" cx="43" cy="43" r="38" />
                  <circle className="fg-circle" id="timer-arc" cx="43" cy="43" r="38" />
                </svg>
                <div className={`timer-num ${timerSec <= 8 && timerSec > 0 ? 'urgent' : ''}`} id="timer-num">
                  {timerSec > 0 ? timerSec : '--'}
                </div>
              </div>
            </div>
          </div>

          <div className="trade-area">
            <div>
              <div className="sec-lbl">① SELECT DIRECTION</div>
              <div className="dir-grid">
                <button className={`btn-dir buy ${selectedDirection === 'BUY' ? 'sel' : ''}`} id="btn-buy" onClick={() => setSelectedDirection('BUY')}>
                  ▲ BUY
                </button>
                <button className={`btn-dir sell ${selectedDirection === 'SELL' ? 'sel' : ''}`} id="btn-sell" onClick={() => setSelectedDirection('SELL')}>
                  ▼ SELL
                </button>
              </div>
            </div>

            <div>
              <div className="sec-lbl">② SELECT QUANTITY</div>
              <div className="qty-row">
                <button className="qty-btn" onClick={() => setUnits((currentUnits) => Math.max(1, currentUnits - 1))}>
                  −
                </button>
                <input className="qty-inp" type="number" id="qty" value={units} min="1" max="20" onChange={(event) => setUnits(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} />
                <button className="qty-btn" onClick={() => setUnits((currentUnits) => Math.min(20, currentUnits + 1))}>
                  +
                </button>
              </div>
              <div className="qty-note">MIN 1 — MAX 20 UNITS</div>
            </div>

            <div className="order-cost-box">
              <div className="oc-lbl">ORDER COST</div>
              <div className="oc-val" id="order-cost">
                {orderCost()}
              </div>
            </div>

            <div>
              <div className="sec-lbl">③ PLACE ORDER</div>
              <button className="btn-submit" id="submit-btn" onClick={handleSubmitOrder} disabled={!gameState.timerActive}>
                {gameState.timerActive ? 'SUBMIT ORDER →' : 'ROUND CLOSED'}
              </button>
              <div className="status-msg" id="status-msg" style={{ marginTop: 8, color: statusColor }}>
                {statusMessage}
              </div>
            </div>

            <div>
              <div className="sec-lbl">YOUR STATS</div>
              <div className="stats-grid">
                <div className="stat-box"><div className="lbl">CASH</div><div className="val nt" id="s-cash">₹{cash.toLocaleString()}</div></div>
                <div className="stat-box"><div className="lbl">PnL</div><div className={`val ${totalPnl > 0 ? 'up' : totalPnl < 0 ? 'dn' : 'nt'}`} id="s-pnl">{totalPnl >= 0 ? '+' : ''}₹{Math.round(totalPnl).toLocaleString()}</div></div>
                <div className="stat-box"><div className="lbl">POSITION</div><div className="val nt" id="s-pos">{selectedDirection ? `${selectedDirection} ${units}` : 'FLAT'}</div></div>
              </div>
            </div>

            <div>
              <div className="sec-lbl">🏆 LIVE LEADERBOARD</div>
              <div className="lb-box" id="lb-list">
                {leaderboard.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--dim)', textAlign: 'center', padding: 12 }}>Loading...</div>
                ) : (
                  leaderboard.slice(0, 10).map((entry, index) => (
                    <div className="lb-row" key={`${entry.name}-${index}`}>
                      <span className="lb-rk">#{index + 1}</span>
                      <span className="lb-nm">{entry.name}</span>
                      <span className={`lb-pnl ${entry.totalPnl >= 0 ? 'up' : 'dn'}`}>
                        {entry.totalPnl >= 0 ? '+' : ''}₹{Math.round(entry.totalPnl).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showResult ? (
        <div className="result-ov on" id="result-ov">
          <div className="result-box">
            <div className="res-arrow" id="res-arrow">
              {resultArrow}
            </div>
            <div className="res-lbl">ROUND RESULT</div>
            <div className="res-pnl" id="res-pnl">
              {resultPnl >= 0 ? '+' : ''}₹{Math.round(resultPnl).toLocaleString()}
            </div>
            <div className="res-detail" id="res-detail">
              {resultDetail}
            </div>
            <button className="res-close" onClick={() => setShowResult(false)}>
              NEXT ROUND →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
