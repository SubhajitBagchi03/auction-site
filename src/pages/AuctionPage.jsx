import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuction } from '../context/AuctionContext';
import * as XLSX from 'xlsx';
import './AuctionPage.css';

const DOODLE_AVATARS = [
  'https://api.dicebear.com/7.x/thumbs/svg?seed=batsman1&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=bowler2&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=keeper3&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=allround4&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=player5&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=cricket6&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=star7&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=champ8&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=hero9&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=legend10&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=sixer11&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=wicket12&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=yorker13&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=bouncer14&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=catch15&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=stumps16&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=boundary17&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=spinner18&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=pacer19&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=captain20&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=opener21&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=finisher22&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=umpire23&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=trophy24&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=bat25&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=ball26&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=pitch27&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=ground28&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=oval29&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=test30&backgroundColor=c0aede',
];

function convertGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let fileId = null;
  let match = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (match) fileId = match[1];
  if (!fileId) { match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/); if (match) fileId = match[1]; }
  if (!fileId) { match = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/); if (match) fileId = match[1]; }
  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  return url;
}

function createHeartbeatSound(audioCtx) {
  let isPlaying = false; let intervalId = null;
  function playBeat() {
    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator(); const gain1 = audioCtx.createGain();
    osc1.type = 'sine'; osc1.frequency.setValueAtTime(60, now); osc1.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain1.gain.setValueAtTime(0.6, now); gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc1.connect(gain1); gain1.connect(audioCtx.destination); osc1.start(now); osc1.stop(now + 0.25);
    const osc2 = audioCtx.createOscillator(); const gain2 = audioCtx.createGain();
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(50, now + 0.25); osc2.frequency.exponentialRampToValueAtTime(35, now + 0.4);
    gain2.gain.setValueAtTime(0.4, now + 0.25); gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    osc2.connect(gain2); gain2.connect(audioCtx.destination); osc2.start(now + 0.25); osc2.stop(now + 0.5);
  }
  return {
    start() { if (isPlaying) return; isPlaying = true; if (audioCtx.state === 'suspended') audioCtx.resume(); playBeat(); intervalId = setInterval(playBeat, 900); },
    stop() { isPlaying = false; if (intervalId) { clearInterval(intervalId); intervalId = null; } }
  };
}

function parsePlayers(json) {
  return json.map((row, index) => {
    const rawPhoto = row['Upload Your Photo'] || row['Photo'] || row['photo'] || row['IMAGE'] || row['Image'] || row['image'] || '';
    return {
      id: index,
      name: row['Your Name'] || row['Name'] || row['name'] || row['PLAYER NAME'] || row['Player Name'] || `Player ${index + 1}`,
      photo: convertGoogleDriveUrl(rawPhoto),
      role: row['Playing Role'] || row['Role'] || row['role'] || row['PLAYING ROLE'] || 'Unknown',
      doodleAvatar: DOODLE_AVATARS[index % DOODLE_AVATARS.length]
    };
  });
}

// Floating cricket decorations data
const FLOATING_ITEMS = [
  { emoji: '🏏', cls: 'deco-bat' },
  { emoji: '🏐', cls: 'deco-ball' },
  { emoji: '🥅', cls: 'deco-wicket' },
  { emoji: '🏏', cls: 'deco-bat2' },
  { emoji: '⚾', cls: 'deco-ball2' },
  { emoji: '🏆', cls: 'deco-trophy' },
  { emoji: '🎯', cls: 'deco-target' },
  { emoji: '🧤', cls: 'deco-glove' },
  { emoji: '🏏', cls: 'deco-bat3' },
  { emoji: '⭐', cls: 'deco-star' },
  { emoji: '🏐', cls: 'deco-ball3' },
];

export default function AuctionPage() {
  const {
    auctionPool, currentPlayerIndex, auctionStarted, auctionFinished, bidAmount,
    biddingActive, bidStopped, unsoldPlayers, soldPlayers, teams,
    playerAssigned, auctionPhase,
    MAX_TEAMS, TEAM_SIZE, TEAM_BUDGET, MIN_BID,
    loadPlayers, startAuction, getCurrentPlayer,
    startBid, incrementBid, resetBid, stopBid, assignPlayerToTeam,
    returnPlayerToPool, pickUnsoldPlayer, markUnsold, moveToNextPlayer,
    resetAuction, setBidAmount, getTeamPlayerCount, isTeamFull, getTeamsNeedingPlayers
  } = useAuction();

  const [selectedTeam, setSelectedTeam] = useState(-1);
  const [customBid, setCustomBid] = useState('');
  const [imageErrors, setImageErrors] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [pickTeam, setPickTeam] = useState(-1);

  // Overlay message box state (shown center screen)
  const [overlayMessage, setOverlayMessage] = useState(null);
  // Pending message to show on "Next Player" click (for over-budget)
  const [pendingNextMessage, setPendingNextMessage] = useState(null);

  const heartbeatRef = useRef(null);
  const audioCtxRef = useRef(null);
  const fileInputRef = useRef(null);

  const currentPlayer = getCurrentPlayer();



  // Heartbeat sound
  const getHeartbeat = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (!heartbeatRef.current) heartbeatRef.current = createHeartbeatSound(audioCtxRef.current);
    return heartbeatRef.current;
  }, []);

  useEffect(() => {
    if (biddingActive && !bidStopped) getHeartbeat().start();
    else if (heartbeatRef.current) heartbeatRef.current.stop();
  }, [biddingActive, bidStopped, getHeartbeat]);

  useEffect(() => {
    return () => { if (heartbeatRef.current) heartbeatRef.current.stop(); if (audioCtxRef.current) audioCtxRef.current.close(); };
  }, []);

  // File upload
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(evt.target.result, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      loadPlayers(parsePlayers(XLSX.utils.sheet_to_json(worksheet)));
      setShowUploadModal(false);
    };
    reader.readAsArrayBuffer(file);
    if (e.target) e.target.value = '';
  }, [loadPlayers]);

  // Google Sheets import
  const handleGoogleSheetImport = useCallback(async () => {
    if (!sheetUrl.trim()) return;
    setSheetLoading(true);
    try {
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (!match) { alert('Invalid Google Sheets URL'); setSheetLoading(false); return; }
      const csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error('Could not fetch. Make sure sheet is shared publicly.');
      const workbook = XLSX.read(await res.text(), { type: 'string' });
      loadPlayers(parsePlayers(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])));
      setSheetUrl('');
      setShowUploadModal(false);
    } catch (err) { alert('Error: ' + err.message); }
    setSheetLoading(false);
  }, [sheetUrl, loadPlayers]);

  // ===== AUCTION ACTION HANDLERS =====
  const handleStartBid = () => startBid();
  const handleStopBid = () => stopBid();

  // ASSIGN TO TEAM: no alerts/warnings before — only post-action messages
  const handleAssignToTeam = () => {
    if (selectedTeam < 0) return;
    const result = assignPlayerToTeam(selectedTeam);
    setSelectedTeam(-1);

    if (result.status === 'team_exhausted') {
      // Show message IMMEDIATELY after assignment (before Next Player)
      setOverlayMessage({
        title: '🚫 Bidding Over!',
        text: `Bid for ${result.teamName} is over! Wait till end of auction and choose rest from unsold players.`,
        type: 'warning'
      });
    } else if (result.status === 'over_budget') {
      // Store for showing when "Next Player" is clicked
      setPendingNextMessage({
        title: '⚠️ Over Budget!',
        text: `${result.teamName} bidded more than remaining points! ${result.playerName} will NOT be added to the team and goes back to the auction pool.`,
        type: 'error',
        player: result.player
      });
    } else if (result.status === 'team_full') {
      setPendingNextMessage({
        title: '⚠️ Team Full!',
        text: `${result.teamName} already has ${TEAM_SIZE} players! ${result.playerName} goes back to the auction pool.`,
        type: 'error',
        player: result.player
      });
    }
  };

  const handleUnsold = () => markUnsold();

  // NEXT PLAYER: check pending messages, show before advancing
  const handleNextPlayer = () => {
    if (pendingNextMessage) {
      // Show the message overlay
      setOverlayMessage(pendingNextMessage);
      // Put the player back in pool
      if (pendingNextMessage.player) {
        returnPlayerToPool(pendingNextMessage.player);
      }
      setPendingNextMessage(null);
    }
    moveToNextPlayer();
  };

  const handleCustomBidAdd = () => {
    const val = parseInt(customBid, 10);
    if (!isNaN(val) && val > 0) { incrementBid(val); setCustomBid(''); }
  };

  // Helpers
  const getRoleIcon = (role) => {
    const r = role?.toLowerCase() || '';
    if (r.includes('bat')) return '🏏'; if (r.includes('bowl')) return '🎯';
    if (r.includes('all')) return '⭐'; if (r.includes('keeper') || r.includes('wicket')) return '🧤';
    return '🏏';
  };
  const getRoleBadgeClass = (role) => {
    const r = role?.toLowerCase() || '';
    if (r.includes('bat')) return 'role-batsman'; if (r.includes('bowl')) return 'role-bowler';
    if (r.includes('all')) return 'role-allrounder'; if (r.includes('keeper') || r.includes('wicket')) return 'role-keeper';
    return 'role-batsman';
  };

  const renderPlayerPhoto = (player) => {
    const hasError = imageErrors[player.id];
    if (player.photo && !hasError) {
      return <img src={player.photo} alt={player.name} className="player-photo" onError={() => setImageErrors(prev => ({ ...prev, [player.id]: true }))} referrerPolicy="no-referrer" />;
    }
    return <img src={player.doodleAvatar || DOODLE_AVATARS[player.id % DOODLE_AVATARS.length]} alt={player.name} className="doodle-avatar" />;
  };

  // Floating cricket decorations
  const renderFloatingDecos = () => (
    <>
      {FLOATING_ITEMS.map((item, i) => (
        <div key={i} className={`cricket-deco ${item.cls}`}>{item.emoji}</div>
      ))}
    </>
  );

  // Upload modal (shared)
  const renderUploadModal = () => (
    <>
      <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />
      <button className="btn-upload" onClick={() => setShowUploadModal(true)}>
        <span className="upload-icon">📊</span><span>Upload Players</span>
      </button>
      {showUploadModal && (
        <div className="upload-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="upload-modal-title">📊 Import Players</h3>
            <div className="upload-option">
              <p className="upload-option-label">📁 Upload Excel File</p>
              <button className="btn-upload-file" onClick={() => fileInputRef.current?.click()}>Choose .xlsx / .csv File</button>
            </div>
            <div className="upload-divider"><span>OR</span></div>
            <div className="upload-option">
              <p className="upload-option-label">🔗 Google Sheets URL</p>
              <input type="url" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..." className="sheet-url-input" />
              <button className="btn-import-sheet" onClick={handleGoogleSheetImport} disabled={sheetLoading || !sheetUrl.trim()}>
                {sheetLoading ? '⏳ Importing...' : '🚀 Import Sheet'}
              </button>
              <p className="upload-hint-small">Sheet must be shared publicly (Anyone with the link)</p>
            </div>
            <button className="btn-close-modal" onClick={() => setShowUploadModal(false)}>✕</button>
          </div>
        </div>
      )}
    </>
  );

  // Overlay message box
  const renderOverlay = () => {
    if (!overlayMessage) return null;
    return (
      <div className="overlay-backdrop">
        <div className={`overlay-box overlay-${overlayMessage.type || 'info'}`}>
          <h2 className="overlay-title">{overlayMessage.title}</h2>
          <p className="overlay-text">{overlayMessage.text}</p>
          <button className="btn-overlay-dismiss" onClick={() => setOverlayMessage(null)}>OK, Got it</button>
        </div>
      </div>
    );
  };



  // ========================
  // PICK UNSOLD PLAYERS SCREEN
  // ========================
  if (auctionFinished && auctionPhase === 'pick_unsold' && unsoldPlayers.length > 0) {
    const teamsNeeding = getTeamsNeedingPlayers();
    return (
      <div className="auction-page">
        <div className="auction-bg"></div>
        {renderFloatingDecos()}
        <div className="pick-unsold-screen">
          <h1 className="pick-title">🎯 Pick Unsold Players</h1>
          <p className="pick-subtitle">
            Teams need {TEAM_SIZE} players (including captain). Pick players to complete your squad!
          </p>
          {teamsNeeding.length > 0 ? (
            <div className="pick-team-selector">
              <label className="pick-label">Picking for:</label>
              <select value={pickTeam} onChange={(e) => setPickTeam(parseInt(e.target.value, 10))} className="team-select">
                <option value={-1}>Select Team</option>
                {teamsNeeding.map((team) => {
                  const realIdx = teams.indexOf(team);
                  return <option key={realIdx} value={realIdx}>{team.name} — needs {TEAM_SIZE - getTeamPlayerCount(team)} more</option>;
                })}
              </select>
            </div>
          ) : (
            <div className="all-teams-full-banner"><span>✅</span> All teams have {TEAM_SIZE} players!</div>
          )}
          <div className="unsold-grid">
            {unsoldPlayers.map((player, idx) => (
              <div key={player.id} className="unsold-card">
                <div className="unsold-photo-wrap">{renderPlayerPhoto(player)}</div>
                <div className="unsold-info">
                  <h3 className="unsold-name">{player.name}</h3>
                  <span className={`player-role-mini ${getRoleBadgeClass(player.role)}`}>{getRoleIcon(player.role)} {player.role}</span>
                </div>
                {pickTeam >= 0 && !isTeamFull(teams[pickTeam]) && (
                  <button className="btn-pick" onClick={() => pickUnsoldPlayer(idx, pickTeam)}>✅ Pick</button>
                )}
              </div>
            ))}
          </div>
          {unsoldPlayers.length > 0 && (teamsNeeding.length === 0 || teamsNeeding.every(t => isTeamFull(t))) && (
            <div className="lottery-section">
              <h2 className="lottery-title">🎟️ Remaining — Physical Lottery</h2>
              <p className="lottery-desc">These {unsoldPlayers.length} player(s) are for the physical paper-chip lottery. Teams may choose to participate.</p>
              <div className="lottery-players">
                {unsoldPlayers.map((p) => <span key={p.id} className="lottery-chip">{getRoleIcon(p.role)} {p.name}</span>)}
              </div>
            </div>
          )}
          <button className="btn-reset" onClick={resetAuction} style={{ marginTop: 24 }}>
            <span className="btn-icon">↻</span> Reset Auction
          </button>
        </div>
        {renderUploadModal()}

        {renderOverlay()}
      </div>
    );
  }

  // ========================
  // WELCOME SCREEN
  // ========================
  if (!auctionStarted && !auctionFinished) {
    return (
      <div className="auction-page">
        <div className="auction-bg"></div>
        {renderFloatingDecos()}
        <div className="welcome-screen">
          <div className="welcome-particles">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="particle" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}></div>
            ))}
          </div>
          <div className="welcome-content">
            <div className="welcome-icon">🏆</div>
            <h1 className="welcome-title">Welcome to</h1>
            <h2 className="welcome-league">Star Champions League</h2>
            <div className="welcome-subtitle">🏏 The Ultimate Cricket Auction Experience 🏏</div>
            <div className="welcome-divider">
              <span>🏏</span><div className="divider-line"></div>
              <span>⚡</span><div className="divider-line"></div><span>🏏</span>
            </div>

            {/* Only show 6 Teams + No. of Players */}
            <div className="rules-summary">
              <span>👥 {MAX_TEAMS} Teams</span>
              <span>🏏 {auctionPool.length} Players</span>
            </div>

            {auctionPool.length > 0 ? (
              <button className="btn-start-auction" onClick={startAuction}>
                <span className="btn-icon">⚡</span> Start Auction <span className="btn-glow"></span>
              </button>
            ) : (
              <p className="upload-hint">📊 Upload player Excel sheet to begin!</p>
            )}
            <button className="btn-reset" onClick={resetAuction}>
              <span className="btn-icon">↻</span> Reset Auction
            </button>
          </div>
        </div>
        {renderUploadModal()}

        {renderOverlay()}
      </div>
    );
  }

  // ========================
  // FINISHED SCREEN
  // ========================
  if (auctionFinished && (auctionPhase !== 'pick_unsold' || unsoldPlayers.length === 0)) {
    return (
      <div className="auction-page">
        <div className="auction-bg"></div>
        {renderFloatingDecos()}
        <div className="finished-screen">
          <div className="finished-icon">🏆</div>
          <h1 className="finished-title">Auction Finished!</h1>
          <p className="finished-subtitle">All players have been auctioned 🎉</p>
          <div className="finished-stats">
            <div className="stat-card"><span className="stat-num">{soldPlayers.length}</span><span className="stat-lbl">Sold</span></div>
            <div className="stat-card unsold-card"><span className="stat-num">{unsoldPlayers.length}</span><span className="stat-lbl">Unsold</span></div>
          </div>
          {unsoldPlayers.length > 0 && (
            <div className="lottery-section">
              <h2 className="lottery-title">🎟️ Lottery Players</h2>
              <p className="lottery-desc">These players are for the physical paper-chip lottery.</p>
              <div className="lottery-players">
                {unsoldPlayers.map((p) => <span key={p.id} className="lottery-chip">{getRoleIcon(p.role)} {p.name}</span>)}
              </div>
            </div>
          )}
          <button className="btn-reset" onClick={resetAuction}><span className="btn-icon">↻</span> Reset Auction</button>
        </div>
        {renderUploadModal()}

        {renderOverlay()}
      </div>
    );
  }

  // ========================
  // ACTIVE AUCTION SCREEN
  // ========================
  const eligibleTeams = teams.filter(t => getTeamPlayerCount(t) < TEAM_SIZE);

  return (
    <div className="auction-page">
      <div className="auction-bg"></div>
      {renderFloatingDecos()}

      <div className="auction-active">
        <div className="player-counter">
          Player {currentPlayerIndex + 1} of {auctionPool.length}
        </div>

        {currentPlayer && (
          <div className={`player-card ${biddingActive ? 'bidding-active' : ''}`}>
            <div className="player-photo-wrapper">{renderPlayerPhoto(currentPlayer)}</div>
            <h2 className="player-name">{currentPlayer.name}</h2>
            <div className={`player-role ${getRoleBadgeClass(currentPlayer.role)}`}>
              {getRoleIcon(currentPlayer.role)} {currentPlayer.role}
            </div>
          </div>
        )}

        <div className="bid-section">
          {!biddingActive && !bidStopped && !playerAssigned && (
            <button className="btn-start-bid" onClick={handleStartBid}><span>🔨</span> Start Bidding</button>
          )}

          {(biddingActive || bidStopped) && (
            <div className="bid-controls">
              <div className="current-bid">
                <span className="bid-label">Current Bid</span>
                <span className="bid-value">{bidAmount}</span>
                <span className="bid-unit">points</span>
              </div>

              {biddingActive && (
                <div className="bid-buttons">
                  <button className="btn-bid-increment" onClick={() => incrementBid(10)}>+10</button>
                  <button className="btn-bid-increment" onClick={() => incrementBid(20)}>+20</button>
                  <div className="custom-bid">
                    <input type="number" value={customBid} onChange={(e) => setCustomBid(e.target.value)} placeholder="Custom" className="custom-bid-input" min="1" />
                    <button className="btn-bid-custom" onClick={handleCustomBidAdd}>+Add</button>
                  </div>
                  <button className="btn-bid-reset" onClick={resetBid}>Reset Bid</button>
                </div>
              )}

              {biddingActive && (
                <button className="btn-stop-bid" onClick={handleStopBid}><span>🛑</span> Stop Bidding</button>
              )}

              {bidStopped && !playerAssigned && (
                <div className="assignment-section">
                  {bidAmount >= MIN_BID ? (
                    <>
                      <div className="assign-team">
                        <select value={selectedTeam} onChange={(e) => setSelectedTeam(parseInt(e.target.value, 10))} className="team-select">
                          <option value={-1}>Select Team</option>
                          {eligibleTeams.map((team) => {
                            const realIdx = teams.indexOf(team);
                            return (
                              <option key={realIdx} value={realIdx}>
                                {team.name} ({team.remainingPoints} pts | {TEAM_SIZE - getTeamPlayerCount(team)} slots)
                              </option>
                            );
                          })}
                        </select>
                        <button className="btn-assign" onClick={handleAssignToTeam} disabled={selectedTeam < 0}>
                          ✅ Add to Team
                        </button>
                      </div>
                      <button className="btn-unsold" onClick={handleUnsold}>❌ Unsold</button>
                    </>
                  ) : (
                    <div className="min-bid-warning">
                      <p>⚠️ Bid is below {MIN_BID} points — player will be marked <strong>Unsold</strong></p>
                      <button className="btn-unsold" onClick={handleUnsold}>❌ Mark Unsold</button>
                    </div>
                  )}
                </div>
              )}

              {playerAssigned && (
                <button className="btn-next-player" onClick={handleNextPlayer}>
                  <span>➡️</span> Next Player
                </button>
              )}
            </div>
          )}
        </div>

        <button className="btn-reset auction-reset" onClick={resetAuction}>
          <span className="btn-icon">↻</span> Reset Auction
        </button>
      </div>

      {renderUploadModal()}

      {renderOverlay()}
    </div>
  );
}
