import { useState, useRef } from 'react';
import { useAuction } from '../context/AuctionContext';
import './TeamDetailsPage.css';

export default function TeamDetailsPage() {
  const { teams, allPlayers, addTeam, resetTeams, MAX_TEAMS, TEAM_SIZE, TEAM_BUDGET, getTeamPlayerCount } = useAuction();
  const [activeTab, setActiveTab] = useState('add');
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [teamLogoFile, setTeamLogoFile] = useState(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState('');
  const logoInputRef = useRef(null);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTeamLogoFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => setTeamLogoPreview(evt.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddTeam = (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    const captain = allPlayers.find(p => p.name?.toLowerCase() === captainName.toLowerCase()) || null;
    const newTeam = {
      name: teamName.trim(),
      logo: teamLogoPreview || '',
      captain: captain ? { name: captain.name, role: captain.role, photo: captain.photo } : null
    };

    addTeam(newTeam);
    setTeamName('');
    setCaptainName('');
    setTeamLogoFile(null);
    setTeamLogoPreview('');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  return (
    <div className="team-details-page">
      <div className="team-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-icon">🛡️</span>
          <span className="sidebar-title">Teams</span>
        </div>
        <button
          className={`sidebar-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          <span>➕</span> Add Team
        </button>
        <button
          className={`sidebar-btn ${activeTab === 'calc' ? 'active' : ''}`}
          onClick={() => setActiveTab('calc')}
        >
          <span>📊</span> Bid Calculations
        </button>
        <button
          className="sidebar-btn sidebar-btn-danger"
          onClick={resetTeams}
        >
          <span>🗑️</span> Reset Teams
        </button>
      </div>

      <div className="team-content">
        {activeTab === 'add' && (
          <div className="add-team-section">
            <h2 className="section-title">
              <span>➕</span> Add New Team
              <span className="team-count-badge">{teams.length}/{MAX_TEAMS}</span>
            </h2>

            {teams.length >= MAX_TEAMS ? (
              <div className="max-teams-msg">⚠️ Maximum {MAX_TEAMS} teams reached!</div>
            ) : (
            <form className="add-team-form" onSubmit={handleAddTeam}>
              <div className="form-group">
                <label className="form-label">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="form-input"
                  placeholder="Enter team name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Team Logo</label>
                <div className="logo-upload">
                  {teamLogoPreview && (
                    <img src={teamLogoPreview} alt="Logo Preview" className="logo-preview" />
                  )}
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="form-input-file"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Captain (from Players)</label>
                <select
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Captain</option>
                  {allPlayers.map((player, idx) => (
                    <option key={idx} value={player.name}>
                      {player.name} ({player.role})
                    </option>
                  ))}
                </select>
                <p className="form-hint">Captain will be auto-removed from auction pool</p>
              </div>

              <button type="submit" className="btn-add-team">
                <span>🛡️</span> Create Team
              </button>
            </form>
            )}

            {/* Existing teams list */}
            {teams.length > 0 && (
              <div className="existing-teams">
                <h3 className="subsection-title">Existing Teams ({teams.length})</h3>
                <div className="teams-grid">
                  {teams.map((team, idx) => (
                    <div key={idx} className="team-mini-card">
                      {team.logo ? (
                        <img src={team.logo} alt={team.name} className="team-mini-logo" />
                      ) : (
                        <div className="team-mini-logo-placeholder">🛡️</div>
                      )}
                      <span className="team-mini-name">{team.name}</span>
                      {team.captain && (
                        <span className="team-mini-captain">👑 {team.captain.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calc' && (
          <div className="bid-calc-section">
            <h2 className="section-title">
              <span>📊</span> Bid Calculations
            </h2>

            {teams.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🏟️</span>
                <p>No teams added yet. Go to "Add Team" to create teams.</p>
              </div>
            ) : (
              <div className="teams-calc-grid">
                {teams.map((team, idx) => {
                  const isExhausted = team.remainingPoints <= 0;
                  return (
                    <div key={idx} className={`team-calc-card ${isExhausted ? 'exhausted' : ''}`}>
                      <div className="team-calc-header">
                        <div className="team-calc-logo-wrap">
                          {team.logo ? (
                            <img src={team.logo} alt={team.name} className="team-calc-logo" />
                          ) : (
                            <div className="team-calc-logo-placeholder">🛡️</div>
                          )}
                        </div>
                        <div className="team-calc-info">
                          <h3 className="team-calc-name">{team.name}</h3>
                          {team.captain && (
                            <div className="team-calc-captain">👑 {team.captain.name}</div>
                          )}
                        </div>
                        <div className={`team-calc-points ${isExhausted ? 'points-exhausted' : ''}`}>
                          <span className="points-value">{team.remainingPoints}</span>
                          <span className="points-label">pts left</span>
                        </div>
                      </div>

                      <div className="team-calc-roster">
                        {/* Captain */}
                        {team.captain && (
                          <div className="roster-player captain-player">
                            <span className="roster-role">👑</span>
                            <span className="roster-name">{team.captain.name}</span>
                            <span className="roster-badge">Captain</span>
                          </div>
                        )}

                        {/* Purchased players */}
                        {team.players.map((player, pIdx) => (
                          <div key={pIdx} className="roster-player">
                            <span className="roster-role">{getRoleIcon(player.role)}</span>
                            <span className="roster-name">{player.name}</span>
                            <span className="roster-bid">{player.bidAmount} pts</span>
                          </div>
                        ))}

                        {team.players.length === 0 && !team.captain && (
                          <div className="roster-empty">No players yet</div>
                        )}
                      </div>

                      <div className="team-calc-footer">
                        <span className="total-spent">
                          Spent: {TEAM_BUDGET - team.remainingPoints} pts
                        </span>
                        <span className="player-count">
                          {getTeamPlayerCount(team)}/{TEAM_SIZE} players
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getRoleIcon(role) {
  const r = role?.toLowerCase() || '';
  if (r.includes('bat')) return '🏏';
  if (r.includes('bowl')) return '🎯';
  if (r.includes('all')) return '⭐';
  if (r.includes('keeper') || r.includes('wicket')) return '🧤';
  return '🏏';
}
