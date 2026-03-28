import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const AuctionContext = createContext();

export function useAuction() {
  return useContext(AuctionContext);
}

// Constants
const MAX_TEAMS = 6;
const TEAM_SIZE = 6;
const TEAM_BUDGET = 1200;
const MIN_BID = 10;
const STORAGE_KEY = 'scl_auction_state';

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function AuctionProvider({ children }) {
  const saved = useRef(loadSaved());
  const s = saved.current;

  const [allPlayers, setAllPlayers] = useState(s?.allPlayers || []);
  const [auctionPool, setAuctionPool] = useState(s?.auctionPool || []);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(s?.currentPlayerIndex || 0);
  const [bidAmount, setBidAmount] = useState(s?.bidAmount || 0);
  const [auctionStarted, setAuctionStarted] = useState(s?.auctionStarted || false);
  const [auctionFinished, setAuctionFinished] = useState(s?.auctionFinished || false);
  const [unsoldPlayers, setUnsoldPlayers] = useState(s?.unsoldPlayers || []);
  const [soldPlayers, setSoldPlayers] = useState(s?.soldPlayers || []);
  const [teams, setTeams] = useState(s?.teams || []);
  const [biddingActive, setBiddingActive] = useState(s?.biddingActive || false);
  const [bidStopped, setBidStopped] = useState(s?.bidStopped || false);
  const [playerAssigned, setPlayerAssigned] = useState(s?.playerAssigned || false);
  const [auctionPhase, setAuctionPhase] = useState(s?.auctionPhase || 'auction');

  // ===== LocalStorage Persistence =====
  useEffect(() => {
    const state = {
      allPlayers, auctionPool, currentPlayerIndex, bidAmount,
      auctionStarted, auctionFinished, unsoldPlayers, soldPlayers,
      teams, biddingActive, bidStopped, playerAssigned, auctionPhase
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [allPlayers, auctionPool, currentPlayerIndex, bidAmount,
    auctionStarted, auctionFinished, unsoldPlayers, soldPlayers,
    teams, biddingActive, bidStopped, playerAssigned, auctionPhase]);

  // ===== Actions =====
  const loadPlayers = useCallback((players) => {
    setAllPlayers(players);
    const captainNames = teams.map(t => t.captain?.name?.toLowerCase());
    const filtered = players.filter(p => !captainNames.includes(p.name?.toLowerCase()));
    setAuctionPool(shuffleArray(filtered));
    setCurrentPlayerIndex(0);
  }, [teams]);

  const startAuction = useCallback(() => {
    if (auctionPool.length === 0) return;
    setAuctionStarted(true);
    setAuctionFinished(false);
    setAuctionPhase('auction');
    setCurrentPlayerIndex(0);
    setBidAmount(0);
    setBiddingActive(false);
    setBidStopped(false);
    setPlayerAssigned(false);
  }, [auctionPool]);

  const getCurrentPlayer = useCallback(() => {
    if (auctionPool.length === 0 || currentPlayerIndex >= auctionPool.length) return null;
    return auctionPool[currentPlayerIndex];
  }, [auctionPool, currentPlayerIndex]);

  const startBid = useCallback(() => {
    setBiddingActive(true);
    setBidStopped(false);
    setBidAmount(0);
    setPlayerAssigned(false);
  }, []);

  const incrementBid = useCallback((amount) => {
    setBidAmount(prev => prev + amount);
  }, []);

  const resetBid = useCallback(() => {
    setBidAmount(0);
  }, []);

  const stopBid = useCallback(() => {
    setBiddingActive(false);
    setBidStopped(true);
  }, []);

  const getTeamPlayerCount = useCallback((team) => {
    return team.players.length + (team.captain ? 1 : 0);
  }, []);

  const isTeamFull = useCallback((team) => {
    return getTeamPlayerCount(team) >= TEAM_SIZE;
  }, [getTeamPlayerCount]);

  const getTeamsNeedingPlayers = useCallback(() => {
    return teams.filter(t => getTeamPlayerCount(t) < TEAM_SIZE);
  }, [teams, getTeamPlayerCount]);

  // assignPlayerToTeam: returns { status, teamName, playerName, player }
  // status: 'ok' | 'team_exhausted' | 'over_budget' | 'error'
  // NO alerts shown here — the UI handles messages
  const assignPlayerToTeam = useCallback((teamIndex) => {
    const player = getCurrentPlayer();
    if (!player || teamIndex < 0) return { status: 'error' };

    const team = teams[teamIndex];

    // OVER BUDGET: bid > remaining points
    // Silently don't add, but mark playerAssigned so Next button shows
    if (bidAmount > team.remainingPoints) {
      setPlayerAssigned(true);
      return {
        status: 'over_budget',
        teamName: team.name,
        playerName: player.name,
        player: player
      };
    }

    // TEAM FULL check
    if (getTeamPlayerCount(team) >= TEAM_SIZE) {
      setPlayerAssigned(true);
      return {
        status: 'team_full',
        teamName: team.name,
        playerName: player.name,
        player: player
      };
    }

    // Normal assignment
    const updatedTeams = [...teams];
    const updatedTeam = { ...updatedTeams[teamIndex] };
    updatedTeam.players = [...updatedTeam.players, { ...player, bidAmount }];
    updatedTeam.remainingPoints = updatedTeam.remainingPoints - bidAmount;
    updatedTeams[teamIndex] = updatedTeam;
    setTeams(updatedTeams);
    setSoldPlayers(prev => [...prev, { ...player, bidAmount, teamName: team.name }]);
    setPlayerAssigned(true);

    // Check if team is now exhausted (0 or fewer points)
    if (updatedTeam.remainingPoints <= 0) {
      return { status: 'team_exhausted', teamName: team.name };
    }

    return { status: 'ok' };
  }, [getCurrentPlayer, teams, bidAmount, getTeamPlayerCount]);

  // Put a player back into the auction pool at a random position after current
  const returnPlayerToPool = useCallback((player) => {
    setAuctionPool(prev => {
      const newPool = [...prev];
      const insertStart = currentPlayerIndex + 1;
      if (insertStart >= newPool.length) {
        newPool.push(player);
      } else {
        const insertAt = insertStart + Math.floor(Math.random() * (newPool.length - insertStart + 1));
        newPool.splice(Math.min(insertAt, newPool.length), 0, player);
      }
      return newPool;
    });
  }, [currentPlayerIndex]);

  const pickUnsoldPlayer = useCallback((playerIndex, teamIndex) => {
    const player = unsoldPlayers[playerIndex];
    if (!player || teamIndex < 0) return;
    const updatedTeams = [...teams];
    const team = { ...updatedTeams[teamIndex] };
    if (getTeamPlayerCount(team) >= TEAM_SIZE) return;
    team.players = [...team.players, { ...player, bidAmount: 0 }];
    updatedTeams[teamIndex] = team;
    setTeams(updatedTeams);
    setUnsoldPlayers(prev => prev.filter((_, i) => i !== playerIndex));
    setSoldPlayers(prev => [...prev, { ...player, bidAmount: 0, teamName: team.name }]);
  }, [unsoldPlayers, teams, getTeamPlayerCount]);

  const markUnsold = useCallback(() => {
    const player = getCurrentPlayer();
    if (!player) return;
    setUnsoldPlayers(prev => [...prev, player]);
    setPlayerAssigned(true);
  }, [getCurrentPlayer]);

  const moveToNextPlayer = useCallback(() => {
    const next = currentPlayerIndex + 1;
    if (next >= auctionPool.length) {
      const teamsNeedPlayers = teams.filter(t =>
        (t.players.length + (t.captain ? 1 : 0)) < TEAM_SIZE
      );
      if (teamsNeedPlayers.length > 0 && unsoldPlayers.length > 0) {
        setAuctionPhase('pick_unsold');
      }
      setAuctionFinished(true);
      setAuctionStarted(false);
    } else {
      setCurrentPlayerIndex(next);
    }
    setBidAmount(0);
    setBiddingActive(false);
    setBidStopped(false);
    setPlayerAssigned(false);
  }, [currentPlayerIndex, auctionPool.length, teams, unsoldPlayers]);

  const addTeam = useCallback((team) => {
    if (teams.length >= MAX_TEAMS) return;
    const newTeam = { ...team, players: [], remainingPoints: TEAM_BUDGET };
    setTeams(prev => [...prev, newTeam]);
    if (team.captain) {
      const captainName = team.captain.name?.toLowerCase();
      setAuctionPool(prev => prev.filter(p => p.name?.toLowerCase() !== captainName));
    }
  }, [teams]);

  const resetAuction = useCallback(() => {
    setCurrentPlayerIndex(0);
    setBidAmount(0);
    setAuctionStarted(false);
    setAuctionFinished(false);
    setUnsoldPlayers([]);
    setSoldPlayers([]);
    setBiddingActive(false);
    setBidStopped(false);
    setAuctionPhase('auction');
    setPlayerAssigned(false);
    setTeams(prev => prev.map(t => ({ ...t, players: [], remainingPoints: TEAM_BUDGET })));
    const captainNames = teams.map(t => t.captain?.name?.toLowerCase());
    const filtered = allPlayers.filter(p => !captainNames.includes(p.name?.toLowerCase()));
    setAuctionPool(shuffleArray(filtered));
    localStorage.removeItem(STORAGE_KEY);
  }, [allPlayers, teams]);

  const resetTeams = useCallback(() => {
    setTeams([]);
    setAuctionPool(shuffleArray([...allPlayers]));
    setCurrentPlayerIndex(0);
    setBidAmount(0);
    setAuctionStarted(false);
    setAuctionFinished(false);
    setUnsoldPlayers([]);
    setSoldPlayers([]);
    setBiddingActive(false);
    setBidStopped(false);
    setAuctionPhase('auction');
    setPlayerAssigned(false);
    localStorage.removeItem(STORAGE_KEY);
  }, [allPlayers]);

  const value = {
    allPlayers, auctionPool, currentPlayerIndex, bidAmount,
    auctionStarted, auctionFinished, unsoldPlayers, soldPlayers,
    teams, biddingActive, bidStopped, playerAssigned, auctionPhase,
    MAX_TEAMS, TEAM_SIZE, TEAM_BUDGET, MIN_BID,
    loadPlayers, startAuction, getCurrentPlayer,
    startBid, incrementBid, resetBid, stopBid,
    assignPlayerToTeam, returnPlayerToPool, pickUnsoldPlayer,
    markUnsold, moveToNextPlayer, addTeam,
    resetAuction, resetTeams, setBidAmount,
    getTeamPlayerCount, isTeamFull, getTeamsNeedingPlayers
  };

  return (
    <AuctionContext.Provider value={value}>
      {children}
    </AuctionContext.Provider>
  );
}
