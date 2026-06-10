"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { io } from "socket.io-client";


type Line = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  owner: "player" | "ai";
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

type Arena = "classic" | "base" | "space" | "temple";
type SocketRegion = "EU" | "US";

type ArenaTheme = {
  readyText: string;
  readyClass: string;
  countdownClass: string;
  countdownGlowClass: string;
  subText: string;
  flashClass: string;
  canvasMain: string;
  canvasGlow: string;
  canvasRgba: (alpha: number) => string;
};

const getArenaTheme = (arena: Arena): ArenaTheme => {
  if (arena === "base") {
    return {
      readyText: "BASE READY",
      readyClass: "text-red-400 drop-shadow-[0_0_18px_rgba(239,68,68,0.95)]",
      countdownClass: "text-red-400",
      countdownGlowClass: "drop-shadow-[0_0_38px_rgba(239,68,68,0.98)]",
      subText: "NEON STADIUM MODE",
      flashClass: "bg-red-500/25",
      canvasMain: "#ff4d4d",
      canvasGlow: "#ef4444",
      canvasRgba: (alpha: number) => `rgba(239,68,68,${alpha})`,
    };
  }

  if (arena === "space") {
    return {
      readyText: "ORBIT READY",
      readyClass: "text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.95)]",
      countdownClass: "text-cyan-100",
      countdownGlowClass: "drop-shadow-[0_0_38px_rgba(34,211,238,0.98)]",
      subText: "SPACE STATION MODE",
      flashClass: "bg-cyan-400/20",
      canvasMain: "#7ef9ff",
      canvasGlow: "#22d3ee",
      canvasRgba: (alpha: number) => `rgba(34,211,238,${alpha})`,
    };
  }

  if (arena === "temple") {
    return {
      readyText: "RUNE READY",
      readyClass: "text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.95)]",
      countdownClass: "text-amber-100",
      countdownGlowClass: "drop-shadow-[0_0_38px_rgba(251,191,36,0.98)]",
      subText: "CRYPTO TEMPLE MODE",
      flashClass: "bg-amber-300/20",
      canvasMain: "#ffe680",
      canvasGlow: "#fbbf24",
      canvasRgba: (alpha: number) => `rgba(251,191,36,${alpha})`,
    };
  }

  return {
    readyText: "BASE READY",
    readyClass: "text-[#0052FF] drop-shadow-[0_0_18px_rgba(0,82,255,0.9)]",
    countdownClass: "text-white",
    countdownGlowClass: "drop-shadow-[0_0_35px_rgba(0,82,255,0.95)]",
    subText: "ONCHAIN ARCADE MODE",
    flashClass: "bg-[#0052FF]/25",
    canvasMain: "#ffffff",
    canvasGlow: "#0052FF",
    canvasRgba: (alpha: number) => `rgba(0,82,255,${alpha})`,
  };
};

const ARENA_OPTIONS: { key: Arena; label: string; title: string; subtitle: string; dot: string; selectedClass: string; previewClass: string }[] = [
  {
    key: "classic",
    label: "CLASSIC",
    title: "CLASSIC",
    subtitle: "RETRO GRID",
    dot: "bg-[#0052FF]",
    selectedClass: "border-[#0052FF] text-white shadow-[0_0_28px_rgba(0,82,255,0.45)]",
    previewClass: "from-[#020204] via-[#04112f] to-black",
  },
  {
    key: "base",
    label: "BASE ARENA",
    title: "BASE",
    subtitle: "NEON STADIUM",
    dot: "bg-red-400",
    selectedClass: "border-red-400 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.42)]",
    previewClass: "from-[#020716] via-[#003bbd] to-[#140305]",
  },
  {
    key: "space",
    label: "SPACE",
    title: "ORBIT",
    subtitle: "SPACE STATION",
    dot: "bg-cyan-300",
    selectedClass: "border-cyan-300 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.42)]",
    previewClass: "from-black via-[#061536] to-[#02040d]",
  },
  {
    key: "temple",
    label: "TEMPLE",
    title: "CHAIN",
    subtitle: "CRYPTO TEMPLE",
    dot: "bg-amber-300",
    selectedClass: "border-amber-300 text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.42)]",
    previewClass: "from-[#050301] via-[#241403] to-[#140b02]",
  },
];

const getArenaLabel = (arena: Arena) =>
  ARENA_OPTIONS.find((item) => item.key === arena)?.label || "CLASSIC";

export default function Home() {

  const socketRef = useRef<any>(null);
  const { address, isConnected } = useAccount();
const { openConnectModal } = useConnectModal();
const [socketRegion, setSocketRegion] = useState<SocketRegion>("EU");
const socketRegionRef = useRef<SocketRegion>("EU");
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [winner, setWinner] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showOnlineSoon, setShowOnlineSoon] = useState(false);
const [joinCode, setJoinCode] = useState("");
const [activeRoomId, setActiveRoomId] =
  useState<string | null>(null);

const [isHost, setIsHost] = useState(false);
const isHostRef = useRef(false);

const receivedLinesRef = useRef<Set<string>>(
  new Set()
);

const lastRemoteScoreTotalRef = useRef<number | null>(null);
const guestRoundRestartingRef = useRef(false);

const winnerRef = useRef<string | null>(null);

const [roomId, setRoomId] = useState<string | null>(null);

const [gameMode, setGameMode] =
  useState<"ai" | "online">("ai");

const gameModeRef =
  useRef<"ai" | "online">("ai");

const roomIdRef = useRef<string | null>(null);
const [copied, setCopied] = useState(false);

const [roomCode, setRoomCode] = useState<string | null>(null);

const [showJoinRoom, setShowJoinRoom] =
  useState(false);

const pauseRef = useRef(false);

const countdownActiveRef = useRef(false);
const countdownDelayTimerRef =
  useRef<ReturnType<typeof setTimeout> | null>(null);
const countdownIntervalRef =
  useRef<ReturnType<typeof setInterval> | null>(null);
const countdownBattleTimerRef =
  useRef<ReturnType<typeof setTimeout> | null>(null);
const lastCountdownKeyRef = useRef<string | null>(null);
const goalLockRef = useRef(false);
const serverPhaseRef = useRef<"waiting" | "countdown" | "playing" | "finished">("waiting");

  const gameStartedRef = useRef(false);

  const [screenShake, setScreenShake] = useState(false);
  const [goalFlash, setGoalFlash] = useState(false);
  const [countdown, setCountdown] = useState<number | string | null>(null);


const [onlineStatus, setOnlineStatus] =
  useState<string | null>(null);
const [playAgainWaiting, setPlayAgainWaiting] = useState(false);
const [finalScore, setFinalScore] =
  useState<{ player: number; ai: number } | null>(null);
const [opponentLeft, setOpponentLeft] = useState(false);
const [matchmaking, setMatchmaking] = useState(false);
const [matchFound, setMatchFound] = useState(false);
const [opponentAddress, setOpponentAddress] =
  useState<string | null>(null);
const [opponentUsername, setOpponentUsername] =
  useState<string | null>(null);
const [username, setUsername] = useState("");
const [usernameInput, setUsernameInput] = useState("");
const [usernameWarning, setUsernameWarning] = useState<string | null>(null);

const cleanUsername = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 10)
    .toUpperCase();

const hudName = (value: string) => {
  const clean = value || "PLAYER";
  return clean.length > 10 ? clean.slice(0, 10) : clean;
};

const scoreAnnouncementName = (value: string) => {
  const clean = value || "PLAYER";
  return clean.length > 12 ? clean.slice(0, 12) : clean;
};

const playerDisplayName =
  username ||
  (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "YOU");

const rivalDisplayName =
  opponentUsername ||
  (opponentAddress
    ? `${opponentAddress.slice(0, 6)}...${opponentAddress.slice(-4)}`
    : "RIVAL");

const playerNameRef = useRef("YOU");
const rivalNameRef = useRef("AI");

useEffect(() => {
  playerNameRef.current = playerDisplayName || "YOU";
  rivalNameRef.current =
    gameModeRef.current === "online" ? rivalDisplayName || "RIVAL" : "AI";
}, [playerDisplayName, rivalDisplayName]);

useEffect(() => {
  socketRegionRef.current = socketRegion;
}, [socketRegion]);

const getReadyUsername = () => {
  const finalName = cleanUsername(usernameInput);

  if (!finalName) {
    setUsernameWarning("ENTER USERNAME FIRST");
    setOnlineStatus("ENTER USERNAME FIRST");
    navigator.vibrate?.(35);
    return null;
  }

  setUsernameWarning(null);
  setUsername(finalName);
  setUsernameInput(finalName);

  if (address) {
    localStorage.setItem(
      `base_boing_username_${address.toLowerCase()}`,
      finalName
    );
  }

  return finalName;
};


  const [showDifficulty, setShowDifficulty] = useState(false);
const [aiDifficulty, setAiDifficulty] =
  useState<"easy" | "normal" | "hard">("normal");

const [arena, setArena] = useState<Arena>("classic");

const arenaRef = useRef<Arena>("classic");

const [showArenaVote, setShowArenaVote] = useState(false);
const [votedArena, setVotedArena] = useState<Arena | null>(null);
const [arenaVotes, setArenaVotes] = useState<{ host: Arena | null; guest: Arena | null }>({
  host: null,
  guest: null,
});
const [selectedMatchArena, setSelectedMatchArena] = useState<Arena | null>(null);

useEffect(() => {
  arenaRef.current = arena;
}, [arena]);



  const GAME_W = 400;
  const GAME_H = 700;
const BALL_START_VX = 1.2;
const BALL_START_VY = 1.8;

const BALL_RESET_VX = 1.2;
const BALL_RESET_VY = 1.8;

const MAX_BALL_SPEED = 10;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const linesRef = useRef<Line[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const drawingRef = useRef<{ x: number; y: number } | null>(null);
  const aiDifficultyRef =
  useRef<"easy" | "normal" | "hard">("normal");

  const currentLineRef = useRef<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  const scoreRef = useRef({
    player: 0,
    ai: 0,
    message: "",
    messageLife: 0,
  });

  const energyRef = useRef({
    value: 100,
  });

  const ballRef = useRef({
    x: 200,
    y: 350,
    r: 8,
    vx: BALL_START_VX,
    vy: BALL_START_VY,
  });

  const targetBallRef = useRef({
    x: 200,
    y: 350,
    vx: BALL_START_VX,
    vy: BALL_START_VY,
  });

  const targetBallUpdatedAtRef = useRef(Date.now());

  const clearCountdownTimers = () => {
    if (countdownDelayTimerRef.current) {
      clearTimeout(countdownDelayTimerRef.current);
      countdownDelayTimerRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (countdownBattleTimerRef.current) {
      clearTimeout(countdownBattleTimerRef.current);
      countdownBattleTimerRef.current = null;
    }
  };

const startCountdown = (startAtMs: number) => {
  clearCountdownTimers();

  countdownActiveRef.current = true;
  pauseRef.current = true;
  gameStartedRef.current = false;
  setGameStarted(false);

  const tick = () => {
    const remaining = startAtMs - Date.now();

    if (remaining > 2000) {
      setCountdown(3);
    } else if (remaining > 1000) {
      setCountdown(2);
    } else if (remaining > 0) {
      setCountdown(1);
    } else {
      setCountdown("BATTLE!");

      countdownBattleTimerRef.current = setTimeout(() => {
        setCountdown(null);
        countdownActiveRef.current = false;
        pauseRef.current = false;
        goalLockRef.current = false;
        gameStartedRef.current = true;
        setGameStarted(true);

        // Server authoritative: server controls online phase.
      }, 700);

      return;
    }

    countdownDelayTimerRef.current = setTimeout(tick, 80);
  };

  tick();
};

  const applySocketState = (state: any) => {
    const hostScore = Number(state.host_score ?? state.hostScore ?? 0);
    const guestScore = Number(state.guest_score ?? state.guestScore ?? 0);
    const serverPhase = state.phase ?? serverPhaseRef.current;
    serverPhaseRef.current = serverPhase;

    const prevPlayerScore = scoreRef.current.player;
    const prevRivalScore = scoreRef.current.ai;

    if (isHostRef.current) {
      scoreRef.current.player = hostScore;
      scoreRef.current.ai = guestScore;
    } else {
      scoreRef.current.player = guestScore;
      scoreRef.current.ai = hostScore;
    }

    const newScoreTotal = scoreRef.current.player + scoreRef.current.ai;

    if (
      gameModeRef.current === "online" &&
      lastRemoteScoreTotalRef.current !== null &&
      newScoreTotal > lastRemoteScoreTotalRef.current
    ) {
      if (scoreRef.current.player > prevPlayerScore) {
        scoreRef.current.message = `${scoreAnnouncementName(playerNameRef.current)} SCORES`;
        scoreRef.current.messageLife = 120;
      } else if (scoreRef.current.ai > prevRivalScore) {
        scoreRef.current.message = `${scoreAnnouncementName(rivalNameRef.current)} SCORES`;
        scoreRef.current.messageLife = 120;
      }

      setGoalFlash(true);
      setScreenShake(true);
      playSound("goal");

      setTimeout(() => setGoalFlash(false), 250);
      setTimeout(() => setScreenShake(false), 320);
    }

    lastRemoteScoreTotalRef.current = newScoreTotal;

    const remoteBallX = Number(state.ball_x ?? state.ball?.x ?? ballRef.current.x);
    const remoteBallY = Number(state.ball_y ?? state.ball?.y ?? ballRef.current.y);
    const remoteBallVx = Number(state.ball_vx ?? state.ball?.vx ?? ballRef.current.vx);
    const remoteBallVy = Number(state.ball_vy ?? state.ball?.vy ?? ballRef.current.vy);

    const displayBallX = remoteBallX;
    const displayBallY = isHostRef.current ? remoteBallY : GAME_H - remoteBallY;
    const displayBallVx = remoteBallVx;
    const displayBallVy = isHostRef.current ? remoteBallVy : -remoteBallVy;

    if (gameModeRef.current === "online") {
      targetBallRef.current.x = displayBallX;
      targetBallRef.current.y = displayBallY;
      targetBallRef.current.vx = displayBallVx;
      targetBallRef.current.vy = displayBallVy;
      targetBallUpdatedAtRef.current = Date.now();
    }

    if (serverPhase === "countdown" || serverPhase === "finished") {
      ballRef.current.x = displayBallX;
      ballRef.current.y = displayBallY;
      ballRef.current.vx = displayBallVx;
      ballRef.current.vy = displayBallVy;

      targetBallRef.current.x = displayBallX;
      targetBallRef.current.y = displayBallY;
      targetBallRef.current.vx = displayBallVx;
      targetBallRef.current.vy = displayBallVy;
    }

    const roundStartRaw = state.round_start_at ?? state.roundStartAt;

    if (
      gameModeRef.current === "online" &&
      serverPhase === "countdown" &&
      roundStartRaw
    ) {
      const countdownKey = String(roundStartRaw);

      if (lastCountdownKeyRef.current !== countdownKey) {
        lastCountdownKeyRef.current = countdownKey;

        pauseRef.current = true;
        gameStartedRef.current = false;
        setGameStarted(false);

        linesRef.current = [];
        trailRef.current = [];
        sparksRef.current = [];

        const serverNowRaw = state.serverNow ?? state.server_now;

        const serverStartAt =
          typeof roundStartRaw === "number"
            ? roundStartRaw
            : new Date(roundStartRaw).getTime();

        const serverNow =
          typeof serverNowRaw === "number"
            ? serverNowRaw
            : Number(serverNowRaw);

        const startAtMs =
          Number.isFinite(serverStartAt) && Number.isFinite(serverNow)
            ? Date.now() + Math.max(0, serverStartAt - serverNow)
            : serverStartAt;

        startCountdown(startAtMs);
      }
    }

    if (
      gameModeRef.current === "online" &&
      serverPhase === "playing" &&
      !state.winner
    ) {
      clearCountdownTimers();
      setCountdown(null);
      countdownActiveRef.current = false;
      pauseRef.current = false;
      gameStartedRef.current = true;
      setGameStarted(true);
    }

    const resolvedWinner =
      state.winner ||
      (hostScore >= 7 ? "host" : guestScore >= 7 ? "guest" : null);

    if (resolvedWinner) {
      setFinalScore({
        player: scoreRef.current.player,
        ai: scoreRef.current.ai,
      });

      if (resolvedWinner === "host") {
        const text = isHostRef.current
          ? gameModeRef.current === "online"
            ? `${playerNameRef.current} WINS`
            : "YOU WIN"
          : gameModeRef.current === "online"
          ? `${rivalNameRef.current} WINS`
          : "P2 WINS";
        winnerRef.current = text;
        setWinner(text);
      }

      if (resolvedWinner === "guest") {
        const text = isHostRef.current
          ? gameModeRef.current === "online"
            ? `${rivalNameRef.current} WINS`
            : "P2 WINS"
          : gameModeRef.current === "online"
          ? `${playerNameRef.current} WINS`
          : "YOU WIN";
        winnerRef.current = text;
        setWinner(text);
      }

      pauseRef.current = true;
      setGameStarted(false);
      gameStartedRef.current = false;
    }
  };


useEffect(() => {
  if (!address) {
    setUsername("");
    setUsernameInput("");
    setUsernameWarning(null);
    return;
  }

  const savedUsername = localStorage.getItem(
    `base_boing_username_${address.toLowerCase()}`
  );

  if (savedUsername) {
    setUsername(savedUsername);
    setUsernameInput(savedUsername);
    setUsernameWarning(null);
  } else {
    setUsername("");
    setUsernameInput("");
    setUsernameWarning(null);
  }
}, [address]);

useEffect(() => {
const SOCKET_URL =
  socketRegion === "US"
    ? process.env.NEXT_PUBLIC_SOCKET_URL_US
    : process.env.NEXT_PUBLIC_SOCKET_URL_EU;

const socket = io(
  SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000",
  {
    transports: ["websocket"],
  }
);
  socketRef.current = socket;

  const prepareOnlineGame = () => {
    scoreRef.current.player = 0;
    scoreRef.current.ai = 0;
    scoreRef.current.message = "";
    scoreRef.current.messageLife = 0;
    energyRef.current.value = 100;

    ballRef.current.x = 200;
    ballRef.current.y = 350;
    ballRef.current.vx = BALL_START_VX;
    ballRef.current.vy = BALL_START_VY;
    targetBallRef.current.x = 200;
    targetBallRef.current.y = 350;
    targetBallRef.current.vx = BALL_START_VX;
    targetBallRef.current.vy = BALL_START_VY;

    linesRef.current = [];
    trailRef.current = [];
    sparksRef.current = [];

    countdownActiveRef.current = false;
    lastCountdownKeyRef.current = null;
    goalLockRef.current = false;
    serverPhaseRef.current = "waiting";
    clearCountdownTimers();

    winnerRef.current = null;
    pauseRef.current = true;
    gameStartedRef.current = false;
    setGameStarted(false);
    setWinner(null);
    setFinalScore(null);
    setPlayAgainWaiting(false);
    setOpponentLeft(false);
    setMatchmaking(false);
    setMatchFound(false);
    // Keep opponent identity when entering an online match.
    setCountdown(null);
    setScreen("game");
  };

  socket.on("connect", () => {
    console.log("SOCKET CONNECTED", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("SOCKET DISCONNECTED");
  });

  socket.on("room-created", ({ roomCode }) => {
    console.log("SOCKET ROOM CREATED", roomCode);

    roomIdRef.current = roomCode;
    setRoomId(roomCode);
    setIsHost(true);
    isHostRef.current = true;
    setRoomCode(roomCode);
    setShowJoinRoom(false);
    setOnlineStatus("WAITING FOR PLAYER...");
  });

  socket.on("room-matched", ({ roomCode, state }) => {
    console.log("SOCKET ROOM MATCHED", roomCode);

    roomIdRef.current = roomCode;
    setRoomId(roomCode);
    setShowOnlineSoon(false);
    setShowJoinRoom(false);
    setOnlineStatus(null);
    setRoomCode(null);
    setActiveRoomId(null);
    setMatchmaking(false);

    setGameMode("online");
    gameModeRef.current = "online";

    setMatchFound(true);

    setTimeout(() => {
      setMatchFound(false);
      prepareOnlineGame();
      applySocketState(state);
    }, 3500);
  });

  socket.on("match-found", ({ roomCode, role, opponentAddress, opponentUsername }) => {
    console.log("MATCH FOUND", roomCode, role, opponentAddress, opponentUsername);

    const hostRole = role === "host";

    roomIdRef.current = roomCode;
    setRoomId(roomCode);
    setIsHost(hostRole);
    isHostRef.current = hostRole;
    setRoomCode(null);
    setShowJoinRoom(false);
    setOnlineStatus("MATCH FOUND");
    setMatchmaking(false);
    setOpponentAddress(opponentAddress ?? null);
    setOpponentUsername(opponentUsername ?? null);

    setGameMode("online");
    gameModeRef.current = "online";
  });

  socket.on("matchmaking-status", ({ status }) => {
    if (status === "searching") {
      setMatchmaking(true);
      setOnlineStatus("SEARCHING OPPONENT...");
    }

    if (status === "cancelled") {
      setMatchmaking(false);
      setOnlineStatus(null);
      setMatchFound(false);
      setOpponentAddress(null);
      setOpponentUsername(null);
    }
  });

  socket.on("game-state", (state) => {
    if (state?.arena && ["classic", "base", "space", "temple"].includes(state.arena)) {
      arenaRef.current = state.arena;
      setArena(state.arena);
    }

    applySocketState(state);
  });

  socket.on("arena-vote-start", ({ votes }) => {
    setShowArenaVote(true);
    setMatchFound(true);
    setSelectedMatchArena(null);
    setVotedArena(null);
    setArenaVotes({
      host: votes?.host ?? null,
      guest: votes?.guest ?? null,
    });
  });

  socket.on("arena-vote-update", ({ votes }) => {
    setArenaVotes({
      host: votes?.host ?? null,
      guest: votes?.guest ?? null,
    });
  });

  socket.on("arena-selected", ({ arena }) => {
    if (["classic", "base", "space", "temple"].includes(arena)) {
      arenaRef.current = arena;
      setArena(arena);
      setSelectedMatchArena(arena);
    }

    setShowArenaVote(false);
  });

  socket.on("remote-line", (line) => {
    const myOwner = isHostRef.current ? "host" : "guest";
    if (line.owner === myOwner) return;

    const remoteX1 = Number(line.x1);
    const remoteY1 = Number(line.y1);
    const remoteX2 = Number(line.x2);
    const remoteY2 = Number(line.y2);

    linesRef.current.push({
      x1: remoteX1,
      y1: isHostRef.current ? remoteY1 : GAME_H - remoteY1,
      x2: remoteX2,
      y2: isHostRef.current ? remoteY2 : GAME_H - remoteY2,
      life: 42,
      owner: "ai",
    });
  });

  socket.on("play-again-status", ({ hostReadyAgain, guestReadyAgain }) => {
    if (hostReadyAgain && guestReadyAgain) {
      setPlayAgainWaiting(false);
      prepareOnlineGame();
    }
  });

  const handleOpponentLeft = () => {
    pauseRef.current = true;
    gameStartedRef.current = false;
    winnerRef.current = null;

    clearCountdownTimers();
    linesRef.current = [];
    trailRef.current = [];
    sparksRef.current = [];

    setGameStarted(false);
    setWinner(null);
    setFinalScore(null);
    setPlayAgainWaiting(false);
    setMatchmaking(false);
    setMatchFound(false);
    setShowArenaVote(false);
    setVotedArena(null);
    setSelectedMatchArena(null);
    setArenaVotes({ host: null, guest: null });
    setOpponentAddress(null);
    setOpponentUsername(null);
    setCountdown(null);
    setGoalFlash(false);
    setScreenShake(false);
    setOpponentLeft(true);
  };

  socket.on("opponent-left", handleOpponentLeft);
  socket.on("opponent-disconnected", handleOpponentLeft);

  socket.on("join-error", (message) => {
    alert(message);
  });

  return () => {
    socket.off("match-found");
    socket.off("matchmaking-status");
    socket.off("arena-vote-start");
    socket.off("arena-vote-update");
    socket.off("arena-selected");
    socket.off("opponent-left");
    socket.off("opponent-disconnected");
    socket.disconnect();
  };
}, [socketRegion]);


  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 400;
    const H = 700;
    const MAX_LINE_LENGTH = 160;

    const limitLine = (
      start: { x: number; y: number },
      end: { x: number; y: number }
    ) => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      const limitedLength = Math.min(length, MAX_LINE_LENGTH);
      const angle = Math.atan2(dy, dx);

      return {
        x: start.x + Math.cos(angle) * limitedLength,
        y: start.y + Math.sin(angle) * limitedLength,
      };
    };

    const resetBall = (direction: "up" | "down") => {
      ballRef.current.x = W / 2;

      goalLockRef.current = true;

      if (direction === "up") {
        ballRef.current.y = H - 175;
        ballRef.current.vx = BALL_RESET_VX;
        ballRef.current.vy = -BALL_RESET_VY;
      } else {
        ballRef.current.y = 175;
        ballRef.current.vx = -BALL_RESET_VX;
        ballRef.current.vy = BALL_RESET_VY;
      }

      linesRef.current = [];
      trailRef.current = [];
      sparksRef.current = [];
    };

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();

      return {
        x: ((e.clientX - rect.left) / rect.width) * W,
        y: ((e.clientY - rect.top) / rect.height) * H,
      };
    };

    const down = (e: PointerEvent) => {
      if (!gameStartedRef.current || pauseRef.current) return;

      const p = getPos(e);
      if (p.y < H / 2) return;

      drawingRef.current = p;
    };

    const move = (e: PointerEvent) => {
      if (!gameStartedRef.current || pauseRef.current) return;

      const start = drawingRef.current;
      if (!start) return;

      const p = getPos(e);
      if (p.y < H / 2) return;

      const distance = Math.hypot(p.x - start.x, p.y - start.y);
      if (distance < 60) return;
      if (energyRef.current.value < 25) return;

      const end = limitLine(start, p);

      const playerLines = linesRef.current.filter(
        (line) => line.owner === "player"
      );

      if (playerLines.length >= 2) {
        const firstPlayerLineIndex = linesRef.current.findIndex(
          (line) => line.owner === "player"
        );

        if (firstPlayerLineIndex !== -1) {
          linesRef.current.splice(firstPlayerLineIndex, 1);
        }
      }

      // CLIENT_INSTANT_LINE_PREDICTION
      // Çizgi oyuncunun kendi ekranında anında görünür.
      // Online modda fizik yine server authoritative kalır; bu sadece input hissini iyileştirir.
      linesRef.current.push({
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        life: 45,
        owner: "player",
      });

if (
  gameModeRef.current === "online" &&
  roomIdRef.current
) {
  socketRef.current?.emit("draw-line", {
    roomCode: roomIdRef.current,
    line: {
      owner: isHostRef.current ? "host" : "guest",
      x1: start.x,
      y1: isHostRef.current ? start.y : H - start.y,
      x2: end.x,
      y2: isHostRef.current ? end.y : H - end.y,
    },
  });
}

      energyRef.current.value -= 25;
      currentLineRef.current = null;
      drawingRef.current = null;
    };

    const up = () => {
      drawingRef.current = null;
      currentLineRef.current = null;
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);

    let frame = 0;
    let animation = 0;

    const loop = () => {
      frame++;

      if (winnerRef.current) {
  animation = requestAnimationFrame(loop);
  return;
}


      if (winner) {
  animation = requestAnimationFrame(loop);
  return;
}
const roundActive = gameStartedRef.current && !pauseRef.current;
const activeArena = arenaRef.current;

      if (energyRef.current.value < 100 && frame % 5 === 0) {
        energyRef.current.value += 1;
      }

      ctx.clearRect(0, 0, W, H);

      if (activeArena === "base") {
        const baseBg = ctx.createLinearGradient(0, 0, 0, H);
        baseBg.addColorStop(0, "#020716");
        baseBg.addColorStop(0.28, "#031d5a");
        baseBg.addColorStop(0.52, "#003bbd");
        baseBg.addColorStop(0.76, "#031d5a");
        baseBg.addColorStop(1, "#020716");
        ctx.fillStyle = baseBg;
        ctx.fillRect(0, 0, W, H);

        const stadiumGlow = ctx.createRadialGradient(
          W / 2,
          H / 2,
          20,
          W / 2,
          H / 2,
          H / 1.05
        );
        stadiumGlow.addColorStop(0, "rgba(255,255,255,0.10)");
        stadiumGlow.addColorStop(0.3, "rgba(0,82,255,0.18)");
        stadiumGlow.addColorStop(0.72, "rgba(0,82,255,0.04)");
        stadiumGlow.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = stadiumGlow;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(255,255,255,0.045)";
        ctx.lineWidth = 1;

        for (let x = 52; x < W - 52; x += 48) {
          ctx.beginPath();
          ctx.moveTo(x, 24);
          ctx.lineTo(x, H - 24);
          ctx.stroke();
        }

        for (let y = 54; y < H - 24; y += 54) {
          ctx.beginPath();
          ctx.moveTo(32, y);
          ctx.lineTo(W - 32, y);
          ctx.stroke();
        }

        for (let y = 42; y < H - 42; y += 36) {
          for (let x = 46; x < W - 46; x += 36) {
            const dotPulse = 0.06 + Math.sin(frame * 0.035 + x * 0.02 + y * 0.02) * 0.025;
            ctx.fillStyle = `rgba(255,255,255,${dotPulse})`;
            ctx.fillRect(x, y, 1.2, 1.2);
          }
        }

        const arenaGlow = 0.65 + Math.sin(frame * 0.045) * 0.18;

        ctx.save();
        ctx.strokeStyle = `rgba(0,82,255,${arenaGlow})`;
        ctx.lineWidth = 4;
        ctx.shadowColor = "#0052FF";
        ctx.shadowBlur = 22;
        ctx.strokeRect(10, 10, W - 20, H - 20);

        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.strokeRect(22, 22, W - 44, H - 44);

        for (let x = 38; x <= W - 38; x += 24) {
          const blink = 0.38 + Math.sin(frame * 0.12 + x * 0.08) * 0.25;

          ctx.beginPath();
          ctx.arc(x, 15, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${blink})`;
          ctx.shadowColor = "#0052FF";
          ctx.shadowBlur = 10;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, H - 15, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.strokeStyle = `rgba(239,68,68,${0.35 + Math.sin(frame * 0.06) * 0.15})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(30, 30);
        ctx.lineTo(30, H - 30);
        ctx.moveTo(W - 30, 30);
        ctx.lineTo(W - 30, H - 30);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      } else if (activeArena === "space") {
        const spaceBg = ctx.createLinearGradient(0, 0, 0, H);
        spaceBg.addColorStop(0, "#02040d");
        spaceBg.addColorStop(0.42, "#061536");
        spaceBg.addColorStop(0.72, "#030918");
        spaceBg.addColorStop(1, "#000000");
        ctx.fillStyle = spaceBg;
        ctx.fillRect(0, 0, W, H);

        const orbitGlow = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, H / 1.1);
        orbitGlow.addColorStop(0, "rgba(34,211,238,0.22)");
        orbitGlow.addColorStop(0.35, "rgba(0,82,255,0.10)");
        orbitGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = orbitGlow;
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 110; i++) {
          const sx = (i * 73 + frame * (0.08 + (i % 3) * 0.035)) % W;
          const sy = (i * 47 + frame * (0.16 + (i % 5) * 0.025)) % H;
          const a = 0.18 + ((i % 7) / 12);
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          ctx.fillRect(sx, sy, i % 5 === 0 ? 1.8 : 1, i % 5 === 0 ? 1.8 : 1);
        }

        ctx.strokeStyle = "rgba(34,211,238,0.10)";
        ctx.lineWidth = 1;
        for (let x = 36; x < W; x += 52) {
          ctx.beginPath();
          ctx.moveTo(x, 18);
          ctx.lineTo(x, H - 18);
          ctx.stroke();
        }
        for (let y = 56; y < H; y += 70) {
          ctx.beginPath();
          ctx.moveTo(18, y);
          ctx.lineTo(W - 18, y);
          ctx.stroke();
        }

        ctx.save();
        const ringPulse = 0.55 + Math.sin(frame * 0.045) * 0.2;
        ctx.strokeStyle = `rgba(34,211,238,${ringPulse})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 18;
        ctx.strokeRect(12, 12, W - 24, H - 24);
        ctx.setLineDash([10, 14]);
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.strokeRect(28, 28, W - 56, H - 56);
        ctx.setLineDash([]);
        ctx.restore();

        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(frame * 0.004);
        ctx.strokeStyle = "rgba(34,211,238,0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 112, 40, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, 78, 26, Math.PI / 2.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (activeArena === "temple") {
        const templeBg = ctx.createLinearGradient(0, 0, 0, H);
        templeBg.addColorStop(0, "#140b02");
        templeBg.addColorStop(0.5, "#241403");
        templeBg.addColorStop(1, "#050301");
        ctx.fillStyle = templeBg;
        ctx.fillRect(0, 0, W, H);

        const goldGlow = ctx.createRadialGradient(W / 2, H / 2, 18, W / 2, H / 2, H / 1.08);
        goldGlow.addColorStop(0, "rgba(251,191,36,0.22)");
        goldGlow.addColorStop(0.45, "rgba(120,53,15,0.14)");
        goldGlow.addColorStop(1, "rgba(0,0,0,0.25)");
        ctx.fillStyle = goldGlow;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(251,191,36,0.09)";
        ctx.lineWidth = 1;
        for (let x = 40; x < W; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 18);
          ctx.lineTo(x, H - 18);
          ctx.stroke();
        }
        for (let y = 60; y < H; y += 60) {
          ctx.beginPath();
          ctx.moveTo(18, y);
          ctx.lineTo(W - 18, y);
          ctx.stroke();
        }

        for (let y = 70; y < H - 60; y += 88) {
          ctx.fillStyle = "rgba(251,191,36,0.12)";
          ctx.fillRect(18, y, 16, 50);
          ctx.fillRect(W - 34, y, 16, 50);
          ctx.fillStyle = "rgba(251,191,36,0.22)";
          ctx.fillRect(14, y - 5, 24, 6);
          ctx.fillRect(W - 38, y - 5, 24, 6);
        }

        ctx.save();
        const templePulse = 0.5 + Math.sin(frame * 0.045) * 0.18;
        ctx.strokeStyle = `rgba(251,191,36,${templePulse})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 18;
        ctx.strokeRect(12, 12, W - 24, H - 24);
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.lineWidth = 1;
        ctx.strokeRect(26, 26, W - 52, H - 52);
        ctx.restore();

        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.strokeStyle = "rgba(251,191,36,0.30)";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath();
          ctx.moveTo(0, -92);
          ctx.lineTo(0, -72);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        ctx.fillStyle = "#020204";
        ctx.fillRect(0, 0, W, H);

        const gradient = ctx.createRadialGradient(
          W / 2,
          H / 2,
          40,
          W / 2,
          H / 2,
          H / 1.2
        );

        gradient.addColorStop(0, "rgba(0,82,255,0.16)");
        gradient.addColorStop(0.45, "rgba(0,82,255,0.05)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(0,82,255,0.08)";
        ctx.lineWidth = 1;

        for (let x = 40; x < W; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 12);
          ctx.lineTo(x, H - 12);
          ctx.stroke();
        }

        for (let y = 60; y < H; y += 60) {
          ctx.beginPath();
          ctx.moveTo(12, y);
          ctx.lineTo(W - 12, y);
          ctx.stroke();
        }
      }

      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 80, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,82,255,0.22)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#0052FF";
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const basePulse = 0.42 + Math.sin(frame * 0.018) * 0.08;
      ctx.fillStyle = `rgba(0,82,255,${basePulse})`;
      ctx.textAlign = "center";
      ctx.shadowColor = "#0052FF";
      ctx.shadowBlur = activeArena === "base" ? 30 : activeArena === "space" ? 28 : activeArena === "temple" ? 28 : 22;

      if (activeArena === "base") {
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.62)";
        ctx.fillText("◇ BASE ARENA ◇", W / 2, H / 2 - 50);

        ctx.fillStyle = `rgba(255,255,255,${0.78 + Math.sin(frame * 0.035) * 0.12})`;
        ctx.font = "900 46px monospace";
        ctx.fillText("BASE", W / 2, H / 2 + 15);

        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "rgba(0,82,255,0.78)";
        ctx.fillText("ONCHAIN STADIUM", W / 2, H / 2 + 38);
      } else if (activeArena === "space") {
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "rgba(34,211,238,0.78)";
        ctx.fillText("◇ SPACE STATION ◇", W / 2, H / 2 - 50);

        ctx.fillStyle = `rgba(210,250,255,${0.82 + Math.sin(frame * 0.035) * 0.1})`;
        ctx.font = "900 40px monospace";
        ctx.fillText("ORBIT", W / 2, H / 2 + 15);

        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "rgba(34,211,238,0.72)";
        ctx.fillText("BASE STATION", W / 2, H / 2 + 38);
      } else if (activeArena === "temple") {
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "rgba(251,191,36,0.82)";
        ctx.fillText("◇ CRYPTO TEMPLE ◇", W / 2, H / 2 - 50);

        ctx.fillStyle = `rgba(255,230,150,${0.82 + Math.sin(frame * 0.035) * 0.1})`;
        ctx.font = "900 36px monospace";
        ctx.fillText("CHAIN", W / 2, H / 2 + 15);

        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "rgba(251,191,36,0.72)";
        ctx.fillText("ANCIENT BASE", W / 2, H / 2 + 38);
      } else {
        ctx.font = "900 46px monospace";
        ctx.fillText("BASE", W / 2, H / 2 + 14);
      }

      ctx.shadowBlur = 0;

      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, W - 24, H - 24);

      ctx.beginPath();
      ctx.moveTo(12, H / 2);
      ctx.lineTo(W - 12, H / 2);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.stroke();

      const score = scoreRef.current;

      const leftName = gameModeRef.current === "online"
        ? hudName(rivalNameRef.current)
        : "AI";
      const rightName = gameModeRef.current === "online"
        ? hudName(playerNameRef.current)
        : "YOU";
      const scoreText = `${leftName} ${score.ai}   ◇   ${score.player} ${rightName}`;
      const hudFontSize = scoreText.length > 34 ? 13 : scoreText.length > 28 ? 15 : 20;

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = `bold ${hudFontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(scoreText, W / 2, 50);

      ctx.fillStyle = "rgba(0,82,255,0.8)";
      ctx.font = "bold 12px monospace";
      ctx.fillText("FIRST TO 7", W / 2, 68);

      const energyWidth = 160;
      const energyHeight = 8;
      const energyX = W / 2 - energyWidth / 2;
      const energyY = 72;

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(energyX, energyY, energyWidth, energyHeight);

      ctx.fillStyle = "rgba(59,130,246,0.85)";
      ctx.fillRect(
        energyX,
        energyY,
        (energyWidth * energyRef.current.value) / 100,
        energyHeight
      );

      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "10px monospace";
      ctx.fillText("ENERGY", W / 2, energyY + 22);

      const canvasTheme = getArenaTheme(activeArena);

      if (score.player === 6 && score.ai === 6) {
        ctx.fillStyle = canvasTheme.canvasRgba(0.95);
        ctx.font = "bold 28px monospace";
        ctx.shadowColor = canvasTheme.canvasGlow;
        ctx.shadowBlur = 26;
        ctx.fillText(activeArena === "base" ? "FINAL BLOCK" : activeArena === "space" ? "ORBIT CLASH" : activeArena === "temple" ? "FINAL RUNE" : "FINAL CLASH", W / 2, H / 2 - 95);
        ctx.shadowBlur = 0;
      } else if (score.player === 6 || score.ai === 6) {
        const matchPulse = 0.65 + Math.sin(frame * 0.08) * 0.35;

        ctx.fillStyle = canvasTheme.canvasRgba(matchPulse);
        ctx.font = "bold 24px monospace";
        ctx.shadowColor = canvasTheme.canvasGlow;
        ctx.shadowBlur = 24;
        ctx.fillText(activeArena === "base" ? "BASE POINT" : activeArena === "space" ? "ORBIT POINT" : activeArena === "temple" ? "CHAIN POINT" : "MATCH POINT", W / 2, H / 2 - 95);
        ctx.shadowBlur = 0;
      }

      if (score.messageLife > 0) {
        const messageAlpha = Math.min(1, score.messageLife / 18);
        const messageScale = 1 + Math.sin(score.messageLife * 0.18) * 0.035;

        ctx.save();
        ctx.translate(W / 2, H / 2 - 125);
        ctx.scale(messageScale, messageScale);
        ctx.fillStyle = canvasTheme.canvasRgba(messageAlpha);
        ctx.font = score.message.length > 15 ? "bold 26px monospace" : "bold 34px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = canvasTheme.canvasGlow;
        ctx.shadowBlur = 30;
        ctx.fillText(score.message, 0, 0);
        ctx.restore();

        score.messageLife--;
      }

      const ball = ballRef.current;

const aiInterval =
  aiDifficultyRef.current === "easy"
    ? 95
    : aiDifficultyRef.current === "hard"
    ? 24
    : 45;
     if (
  gameModeRef.current === "ai" &&
  frame % aiInterval === 0 &&
  ball.y < H / 2 - 20 &&
  ball.vy < 0
) {
  const aiY1 = Math.max(35, ball.y - 35);
  const aiY2 = Math.max(35, ball.y - 10);

  const aiError =
    aiDifficultyRef.current === "easy"
      ? (Math.random() - 0.5) * 200
      : aiDifficultyRef.current === "normal"
      ? (Math.random() - 0.5) * 60
      : 0;

  linesRef.current.push({
    x1: ball.x + aiError - 55,
    y1: Math.min(aiY1, H / 2 - 25),
    x2: ball.x + aiError + 55,
    y2: Math.min(aiY2, H / 2 - 25),
    life: 55,
    owner: "ai",
  });
}

if (roundActive) {
  if (gameModeRef.current === "online") {
    // SERVER_AUTHORITATIVE_RENDER
    // Online modda fizik client'ta çalışmaz. Host ve guest sadece server state'ini yumuşak render eder.
    const elapsedFrames = Math.min(
      4,
      (Date.now() - targetBallUpdatedAtRef.current) / 16.67
    );

    const predictedX = Math.max(
      22,
      Math.min(
        W - 22,
        targetBallRef.current.x + targetBallRef.current.vx * elapsedFrames
      )
    );

    const predictedY = Math.max(
      22,
      Math.min(
        H - 22,
        targetBallRef.current.y + targetBallRef.current.vy * elapsedFrames
      )
    );

    const dx = predictedX - ball.x;
    const dy = predictedY - ball.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 0.9 || distance > 90) {
      ball.x = predictedX;
      ball.y = predictedY;
    } else {
      ball.x += dx * 0.32;
      ball.y += dy * 0.32;
    }

    ball.vx = targetBallRef.current.vx;
    ball.vy = targetBallRef.current.vy;
  } else {
    // AI/local mode physics.
    const speedBeforeMove = Math.hypot(ball.vx, ball.vy);
    const steps = Math.max(1, Math.ceil(speedBeforeMove / 2));
    const stepVx = ball.vx / steps;
    const stepVy = ball.vy / steps;

    let hitLine: Line | null = null;

    for (let s = 0; s < steps; s++) {
      ball.x += stepVx;
      ball.y += stepVy;

      for (const line of linesRef.current) {
        if (line.life < 4) continue;

        const lineDx = line.x2 - line.x1;
        const lineDy = line.y2 - line.y1;
        const lenSq = lineDx * lineDx + lineDy * lineDy;

        if (lenSq === 0) continue;

        const t = Math.max(
          0,
          Math.min(
            1,
            ((ball.x - line.x1) * lineDx +
              (ball.y - line.y1) * lineDy) /
              lenSq
          )
        );

        const px = line.x1 + t * lineDx;
        const py = line.y1 + t * lineDy;
        const dist = Math.hypot(ball.x - px, ball.y - py);

        if (dist < ball.r + 6) {
          const currentSpeed = Math.hypot(ball.vx, ball.vy);
          const speed = Math.min(currentSpeed + 0.25, MAX_BALL_SPEED);

          let nx = -lineDy;
          let ny = lineDx;

          const nLen = Math.hypot(nx, ny) || 1;
          nx /= nLen;
          ny /= nLen;

          const dot = ball.vx * nx + ball.vy * ny;

          if (dot > 0) {
            nx *= -1;
            ny *= -1;
          }

          ball.vx = nx * speed + lineDx * 0.006;
          ball.vy = ny * speed + lineDy * 0.006;

          const nextSpeed = Math.hypot(ball.vx, ball.vy);
          if (nextSpeed > MAX_BALL_SPEED) {
            ball.vx = (ball.vx / nextSpeed) * MAX_BALL_SPEED;
            ball.vy = (ball.vy / nextSpeed) * MAX_BALL_SPEED;
          }

          const overlap = ball.r + 6 - dist;

          if (overlap > 0) {
            ball.x += nx * (overlap + 0.75);
            ball.y += ny * (overlap + 0.75);
          }

          hitLine = line;
          line.life = 0;
          break;
        }
      }

      if (hitLine) break;
    }

    if (hitLine) {
      for (let i = 0; i < 12; i++) {
        sparksRef.current.push({
          x: ball.x,
          y: ball.y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 22,
          color: hitLine.owner === "player" ? "#0052FF" : "#ef4444",
        });
      }

      navigator.vibrate?.(12);
      playSound("hit");
    }
  }
}

// Server authoritative: client does not emit host-state during gameplay.


      trailRef.current.push({ x: ball.x, y: ball.y });

      if (trailRef.current.length > 20) {
        trailRef.current.shift();
      }

if (roundActive && gameModeRef.current !== "online" && (ball.x < 22 || ball.x > W - 22)) {
  ball.vx *= -1;
  playSound("wall");
}

if (
  roundActive &&
  gameModeRef.current !== "online" &&
  !goalLockRef.current &&
  ball.y < 22
) {
  console.log("TOP GOAL CHECK", {
    mode: gameModeRef.current,
    isHost: isHostRef.current,
    score: scoreRef.current,
  });

  goalLockRef.current = true;
  score.player++;


if (score.player >= 7) {
  pauseRef.current = true;
  gameStartedRef.current = false;
  setGameStarted(false);

  const winText = "YOU WIN";
  score.message = winText;
  winnerRef.current = winText;
  setWinner(winText);
  console.log("HOST WIN TRIGGERED");
} else {
  score.message = "YOU SCORES";
  pauseRef.current = true;
  gameStartedRef.current = false;
  setGameStarted(false);
  setGoalFlash(true);
  setScreenShake(true);
  playSound("goal");

  setTimeout(() => setGoalFlash(false), 250);
  setTimeout(() => setScreenShake(false), 320);

  resetBall("down");

  const roundStartAt = Date.now() + 1800;

  setTimeout(() => {
    pauseRef.current = false;
    startCountdown(roundStartAt);
  }, 0);
}

        score.messageLife = 70;
      }
if (
  roundActive &&
  gameModeRef.current !== "online" &&
  !goalLockRef.current &&
  ball.y > H - 22
) {
  console.log("BOTTOM GOAL CHECK", {
    mode: gameModeRef.current,
    isHost: isHostRef.current,
    score: scoreRef.current,
  });

  goalLockRef.current = true;
  score.ai++;

if (score.ai >= 7) {
  pauseRef.current = true;
  gameStartedRef.current = false;
  setGameStarted(false);

  const loseText = "AI WINS";
  score.message = loseText;
  winnerRef.current = loseText;
  setWinner(loseText);
} else {
  const goalText = "AI SCORES";

  score.message = goalText;
  pauseRef.current = true;
  gameStartedRef.current = false;
  setGameStarted(false);
  setGoalFlash(true);
  setScreenShake(true);
  playSound("goal");

  setTimeout(() => setGoalFlash(false), 250);
  setTimeout(() => setScreenShake(false), 320);

  resetBall("up");

  const roundStartAt = Date.now() + 1800;

  setTimeout(() => {
    pauseRef.current = false;
    startCountdown(roundStartAt);
  }, 0);
}

        score.messageLife = 70;
      }

      linesRef.current = linesRef.current
        .map((line) => ({
          ...line,
          life: line.life - 1,
        }))
        .filter((line) => line.life > 0);

      for (const line of linesRef.current) {
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);

        ctx.lineWidth = 10;
        ctx.lineCap = "round";

        const alpha = Math.max(line.life / 35, 0.05);

        if (activeArena === "base") {
          ctx.strokeStyle = `rgba(239,68,68,${alpha})`;
          ctx.shadowColor = "#ef4444";
        } else if (activeArena === "space") {
          ctx.strokeStyle = `rgba(34,211,238,${alpha})`;
          ctx.shadowColor = "#22d3ee";
        } else if (activeArena === "temple") {
          ctx.strokeStyle = `rgba(251,191,36,${alpha})`;
          ctx.shadowColor = "#fbbf24";
        } else {
          ctx.strokeStyle =
            line.owner === "player"
              ? `rgba(0,82,255,${alpha})`
              : `rgba(239,68,68,${alpha})`;

          ctx.shadowColor = line.owner === "player" ? "#0052FF" : "#ef4444";
        }

        ctx.shadowBlur = activeArena === "base" || activeArena === "space" || activeArena === "temple" ? 34 : 28;

        ctx.globalCompositeOperation = "lighter";
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowBlur = 0;
      }

      for (let i = 0; i < trailRef.current.length; i++) {
        const point = trailRef.current[i];
        const alpha = i / trailRef.current.length;

        ctx.beginPath();
        ctx.arc(point.x, point.y, ball.r * alpha * 1.4, 0, Math.PI * 2);

        ctx.fillStyle =
          activeArena === "base"
            ? `rgba(239,68,68,${alpha * 0.30})`
            : activeArena === "space"
            ? `rgba(34,211,238,${alpha * 0.30})`
            : activeArena === "temple"
            ? `rgba(251,191,36,${alpha * 0.30})`
            : `rgba(0,82,255,${alpha * 0.28})`;
        ctx.shadowColor =
          activeArena === "base"
            ? "#ef4444"
            : activeArena === "space"
            ? "#22d3ee"
            : activeArena === "temple"
            ? "#fbbf24"
            : "#0052FF";
        ctx.shadowBlur = activeArena === "base" || activeArena === "space" || activeArena === "temple" ? 18 : 14;

        ctx.fill();
      }

      ctx.shadowBlur = 0;

      sparksRef.current = sparksRef.current
        .map((s) => ({
          ...s,
          x: s.x + s.vx,
          y: s.y + s.vy,
          vx: s.vx * 0.96,
          vy: s.vy * 0.96,
          life: s.life - 1,
        }))
        .filter((s) => s.life > 0);

      for (const spark of sparksRef.current) {
        const alpha = spark.life / 22;

        ctx.beginPath();
        ctx.arc(spark.x, spark.y, 2 + alpha * 3, 0, Math.PI * 2);

        ctx.fillStyle =
          spark.color === "#0052FF"
            ? `rgba(0,82,255,${alpha})`
            : `rgba(239,68,68,${alpha})`;

        ctx.shadowColor = spark.color;
        ctx.shadowBlur = 14;
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 8, 0, Math.PI * 2);
      ctx.fillStyle = activeArena === "base" ? "rgba(239,68,68,0.18)" : activeArena === "space" ? "rgba(34,211,238,0.18)" : activeArena === "temple" ? "rgba(251,191,36,0.18)" : "rgba(0,82,255,0.18)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 3, 0, Math.PI * 2);
      ctx.fillStyle = activeArena === "base" ? "rgba(239,68,68,0.72)" : activeArena === "space" ? "rgba(34,211,238,0.72)" : activeArena === "temple" ? "rgba(251,191,36,0.72)" : "rgba(0,82,255,0.65)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.shadowColor = activeArena === "base" ? "#ef4444" : activeArena === "space" ? "#22d3ee" : activeArena === "temple" ? "#fbbf24" : "#0052FF";
      ctx.shadowBlur = activeArena === "base" || activeArena === "space" || activeArena === "temple" ? 30 : 24;
      ctx.fill();

      ctx.shadowBlur = 0;

      animation = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animation);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
    };
  }, []);


const playSound = (
  type: "hit" | "wall" | "goal"
) => {
  const AudioContextClass =
    window.AudioContext;

  const audioCtx = new AudioContextClass();

  const oscillator =
    audioCtx.createOscillator();

  const gain =
    audioCtx.createGain();

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === "hit") {
    oscillator.frequency.value = 520;
    gain.gain.value = 0.05;
  }

  if (type === "wall") {
    oscillator.frequency.value = 220;
    gain.gain.value = 0.04;
  }

  if (type === "goal") {
    oscillator.frequency.value = 120;
    gain.gain.value = 0.08;
  }

  oscillator.type = "square";

  oscillator.start();

  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioCtx.currentTime + 0.12
  );

  oscillator.stop(
    audioCtx.currentTime + 0.12
  );
};

  const startGame = () => {
    scoreRef.current.player = 0;
    scoreRef.current.ai = 0;
    scoreRef.current.message = "";
    scoreRef.current.messageLife = 0;
    energyRef.current.value = 100;

    ballRef.current.x = 200;
    ballRef.current.y = 350;
    ballRef.current.vx = BALL_START_VX;
    ballRef.current.vy = BALL_START_VY;
    targetBallRef.current.x = 200;
    targetBallRef.current.y = 350;
    targetBallRef.current.vx = BALL_START_VX;
    targetBallRef.current.vy = BALL_START_VY;

    linesRef.current = [];
    trailRef.current = [];
    sparksRef.current = [];

    lastRemoteScoreTotalRef.current = null;
    guestRoundRestartingRef.current = false;
    countdownActiveRef.current = false;
    lastCountdownKeyRef.current = null;
    goalLockRef.current = false;
    serverPhaseRef.current = "waiting";
    clearCountdownTimers();

    winnerRef.current = null;
    pauseRef.current = true;
    gameStartedRef.current = false;
    setGameStarted(false);
    setWinner(null);
    setFinalScore(null);
    setPlayAgainWaiting(false);
    setOpponentLeft(false);
    setMatchmaking(false);
    setMatchFound(false);
    setOpponentAddress(null);
    setOpponentUsername(null);
    setCountdown(null);
    setScreen("game");

    if (gameModeRef.current === "ai") {
      pauseRef.current = false;
      startCountdown(Date.now() + 3000);
      return;
    }

    // Server authoritative: online countdown is started by the server.
  };

  const handlePlayAgain = async () => {
    if (gameModeRef.current !== "online") {
      startGame();
      return;
    }

    if (!roomIdRef.current) return;

    setPlayAgainWaiting(true);

    socketRef.current?.emit("play-again-ready", {
      roomCode: roomIdRef.current,
      role: isHostRef.current ? "host" : "guest",
    });
  };

  const goMainMenu = () => {
    scoreRef.current.player = 0;
    scoreRef.current.ai = 0;
    scoreRef.current.message = "";
    scoreRef.current.messageLife = 0;
    energyRef.current.value = 100;

    linesRef.current = [];
    trailRef.current = [];
    sparksRef.current = [];

    gameStartedRef.current = false;
    serverPhaseRef.current = "waiting";

    setGameStarted(false);
    setWinner(null);
    setFinalScore(null);
    setPlayAgainWaiting(false);
    setOpponentLeft(false);
    setMatchmaking(false);
    setMatchFound(false);
    setOpponentAddress(null);
    setOpponentUsername(null);
    setCountdown(null);
    setShowOnlineSoon(false);
    setShowJoinRoom(false);
    setOnlineStatus(null);
    setRoomCode(null);
    setJoinCode("");
    setActiveRoomId(null);
    setRoomId(null);
    roomIdRef.current = null;
    setIsHost(false);
    isHostRef.current = false;
    setGameMode("ai");
    gameModeRef.current = "ai";
    setPlayAgainWaiting(false);
    setScreen("menu");
  };

  const activeArenaTheme = getArenaTheme(arena);

  return (
    <main
      className={`fixed inset-0 w-screen h-[100dvh] bg-black flex items-center justify-center overflow-hidden overscroll-none ${
        screenShake ? "goal-shake" : ""
      }`}
      style={{ touchAction: "none" }}
    >
      {showSplash && (
        <div className="absolute inset-0 z-[999] bg-black flex items-center justify-center">
          <img
            src="/splash.png"
            alt="Base Boing Battle"
            className="h-full w-auto max-w-full object-contain"
          />
        </div>
      )}

      {!showSplash && screen === "menu" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
          <img
            src="/splash.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
          />

          <div className="absolute inset-0 bg-black/75" />
    
<div className="absolute inset-0 opacity-[0.08]">
  <div
    className="w-full h-full"
    style={{
      backgroundImage: `
        linear-gradient(rgba(0,82,255,.5) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,82,255,.5) 1px, transparent 1px)
      `,
      backgroundSize: "48px 48px",
    }}
  />
</div>


          <div className="relative z-10 flex flex-col items-center text-center">

<div className="mb-4 relative">
  <div className="w-28 h-28 rounded-full border-2 border-[#0052FF]/60 animate-pulse" />

  <div className="absolute inset-0 rounded-full bg-[#0052FF]/10 blur-xl" />

  {/* dönen enerji noktası */}
  <div className="absolute inset-0 animate-[spin_5s_linear_infinite]">
    <div className="absolute left-1/2 top-0 w-3 h-3 rounded-full bg-[#0052FF] shadow-[0_0_12px_rgba(0,82,255,1)] -translate-x-1/2" />
  </div>

  {/* merkez çekirdek */}
  <div className="absolute left-1/2 top-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_30px_rgba(0,82,255,1)]" />

  <div className="absolute left-1/2 top-1/2 w-4 h-[3px] -translate-x-1/2 -translate-y-1/2 bg-[#0052FF]" />

  <div className="mt-2 text-[10px] tracking-[0.35em] text-[#0052FF]/60 font-black">
  BASE CORE
</div>
</div>

            <h1 className="text-white text-5xl font-black tracking-[0.2em]">
              BASE BOING
            </h1>

            <div className="text-[#0052FF] text-xl font-black tracking-[0.45em] mt-2">
              BATTLE
            </div>

            <p className="mt-2 text-[10px] tracking-[0.35em] text-[#0052FF] font-black">
  BUILT ON BASE
</p>

            <p className="mt-5 text-white/35 text-xs tracking-[0.35em]">
              DEFLECT • SURVIVE • DOMINATE
            </p>

<button
  onClick={() => setShowDifficulty(true)}
  className="mt-12 w-[240px] h-[58px] rounded-full bg-[#0052FF] text-white font-black tracking-[0.2em] shadow-[0_0_30px_rgba(0,82,255,0.35)]"
>
  PLAY VS AI
</button>
{showDifficulty && (
  <div className="absolute inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center px-6">
    <div className="w-full max-w-[430px] text-center bg-[#050814] border border-[#0052FF]/20 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,82,255,0.15)]">
      <h2 className="text-white text-3xl font-black mb-2">
        SELECT AI
      </h2>

      <p className="text-[#0052FF] text-xs font-black tracking-[0.35em] mb-5">
        DIFFICULTY
      </p>

      <div className="mb-6">
        <p className="text-white/30 text-[10px] font-black tracking-[0.32em]">
          SELECT ARENA
        </p>

        <div className="mt-3 grid w-full grid-cols-2 gap-3">
          {ARENA_OPTIONS.map((item) => {
            const selected = arena === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setArena(item.key)}
                className={`group relative h-[78px] overflow-hidden rounded-2xl border bg-black/45 p-3 text-left transition ${
                  selected
                    ? item.selectedClass
                    : "border-white/10 text-white/55 hover:border-white/30"
                }`}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.previewClass} opacity-70`} />
                <div className="pointer-events-none absolute inset-x-3 top-3 h-[3px] rounded-full bg-white/20" />
                <div className={`pointer-events-none absolute bottom-3 right-3 h-3 w-3 rounded-full ${item.dot} shadow-[0_0_16px_currentColor]`} />

                <div className="pointer-events-none relative z-10">
                  <div className="text-[12px] font-black tracking-[0.18em] text-white">
                    {item.title}
                  </div>
                  <div className="mt-1 text-[7px] font-black tracking-[0.25em] text-white/45">
                    {item.subtitle}
                  </div>
                  <div className="mt-3 flex gap-1">
                    <span className={`h-1 w-8 rounded-full ${item.dot}`} />
                    <span className="h-1 w-5 rounded-full bg-white/25" />
                    <span className="h-1 w-3 rounded-full bg-white/15" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {(["easy", "normal", "hard"] as const).map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => {
            setAiDifficulty(level);
            aiDifficultyRef.current = level;
            setGameMode("ai");
            gameModeRef.current = "ai";
            setShowDifficulty(false);
            startGame();
          }}
          className="mt-3 w-full h-[52px] rounded-full border border-[#0052FF]/50 text-[#0052FF] font-black tracking-[0.2em] hover:bg-[#0052FF] hover:text-white transition"
        >
          {level.toUpperCase()}
        </button>
      ))}

      <button
        type="button"
        onClick={() => setShowDifficulty(false)}
        className="mt-6 text-white/35 text-xs font-black tracking-[0.25em]"
      >
        BACK
      </button>
    </div>
  </div>
)}

            <button
              onClick={() => setShowOnlineSoon(true)}
              className="mt-4 w-[240px] h-[58px] rounded-full border border-[#0052FF]/50 text-[#0052FF] font-black tracking-[0.2em] hover:bg-[#0052FF]/10 transition"
            >
              ONLINE 1V1
            </button>

            <button
              onClick={() => setShowHowToPlay(true)}
              className="mt-4 w-[240px] h-[58px] rounded-full border border-white/15 text-white/70 font-black tracking-[0.2em] hover:bg-white/10 transition"
            >
              HOW TO PLAY
            </button>
          </div>
        </div>
      )}

      {showHowToPlay && (
        <div className="absolute inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center px-8">
          <div className="max-w-sm text-center bg-[#050814] border border-[#0052FF]/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,82,255,0.15)]">
            <h2 className="text-white text-3xl font-black mb-6">
              HOW TO PLAY
            </h2>

            <div className="space-y-4 text-white/80 text-sm leading-7">
              <p>Draw lines to deflect the ball.</p>
              <p>Protect your goal and score against your opponent.</p>
              <p>First player to reach 7 wins.</p>
              <p>Match Point activates at 6.</p>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="mt-8 px-7 py-3 rounded-full bg-[#0052FF] text-white font-black tracking-[0.2em]"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

{showOnlineSoon && (
  <div className="absolute inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center px-8">
    <div className="w-full max-w-sm text-center bg-[#050814] border border-[#0052FF]/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,82,255,0.15)]">
      <h2 className="text-white text-3xl font-black mb-2">
        ONLINE 1V1
      </h2>

      <p className="text-[#0052FF] text-xs font-black tracking-[0.35em] mb-6">
        BASE MULTIPLAYER
      </p>

      <div className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-3">
        <p className="text-white/35 text-[10px] font-black tracking-[0.3em] mb-3">
          REGION
        </p>

        <div className="grid grid-cols-2 gap-2">
          {(["EU", "US"] as SocketRegion[]).map((region) => {
            const selected = socketRegion === region;
            const disabled = matchmaking || Boolean(roomCode) || screen === "game";

            return (
              <button
                key={region}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  setSocketRegion(region);
                  setOnlineStatus(null);
                  setShowJoinRoom(false);
                }}
                className={`h-[42px] rounded-xl border text-[11px] font-black tracking-[0.22em] transition ${
                  selected
                    ? "border-[#0052FF] bg-[#0052FF] text-white shadow-[0_0_18px_rgba(0,82,255,0.35)]"
                    : "border-white/10 bg-black/35 text-white/45 hover:border-[#0052FF]/50 hover:text-[#0052FF]"
                } ${disabled ? "opacity-60" : ""}`}
              >
                {region === "EU" ? "EU" : "US"}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-white/25 text-[9px] font-black tracking-[0.18em]">
          {socketRegion === "EU" ? "FRANKFURT SERVER" : "OHIO SERVER"}
        </p>
      </div>

<button
  onClick={() => {
    if (!isConnected) {
      openConnectModal?.();
    }
  }}
  className="w-full h-[54px] rounded-full bg-[#0052FF] text-white font-black tracking-[0.18em]"
>
  {isConnected && address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "CONNECT WALLET"}
</button>
{isConnected && (
  <p className="mt-2 text-white/30 text-[10px] tracking-[0.25em]">
    WALLET CONNECTED
  </p>
)}

{isConnected && (
  <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
    <p className="text-white/35 text-[10px] font-black tracking-[0.3em]">
      USERNAME
    </p>

    <div className="mt-3 flex gap-2">
      <input
        value={usernameInput}
        onChange={(e) => {
          setUsernameInput(cleanUsername(e.target.value));
          setUsernameWarning(null);
        }}
        maxLength={10}
        placeholder="MAX 10"
        className="h-[44px] min-w-0 flex-1 rounded-xl bg-black/45 border border-white/10 px-3 text-center text-white font-black tracking-[0.14em] outline-none placeholder:text-white/20"
      />

      <button
        onClick={() => {
          if (!address) return;

          const finalName = getReadyUsername();
          if (!finalName) return;
        }}
        className="h-[44px] px-4 rounded-xl bg-[#0052FF] text-white text-[10px] font-black tracking-[0.2em]"
      >
        SAVE
      </button>
    </div>

    <p className="mt-2 text-[#0052FF]/70 text-[10px] font-black tracking-[0.2em]">
      {cleanUsername(usernameInput)
        ? `READY AS ${cleanUsername(usernameInput)}`
        : "CHOOSE YOUR ARENA NAME"}
    </p>

    {usernameWarning && (
      <p className="mt-2 text-red-400 text-[10px] font-black tracking-[0.22em] animate-pulse">
        {usernameWarning}
      </p>
    )}
  </div>
)}

<button
  onClick={() => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    const readyUsername = getReadyUsername();
    if (!readyUsername) return;

    if (matchmaking) return;

    setMatchmaking(true);
    setShowJoinRoom(false);
    setRoomCode(null);
    setOnlineStatus("SEARCHING OPPONENT...");

    socketRef.current?.emit("find-match", {
      address,
      username: readyUsername,
    });
  }}
  disabled={matchmaking}
  className={`mt-4 w-full h-[54px] rounded-full bg-[#0052FF] text-white font-black tracking-[0.18em] ${
    matchmaking ? "opacity-60" : ""
  }`}
>
  {matchmaking ? "SEARCHING..." : "FIND MATCH"}
</button>

{matchmaking && (
  <button
    onClick={() => {
      setMatchmaking(false);
      setOnlineStatus(null);
      socketRef.current?.emit("cancel-matchmaking");
    }}
    className="mt-3 w-full h-[48px] rounded-full border border-white/15 text-white/60 font-black tracking-[0.18em]"
  >
    CANCEL SEARCH
  </button>
)}

{matchmaking && onlineStatus && (
  <div className="mt-5">
    <p className="text-[#0052FF] text-xs font-black tracking-[0.25em] animate-pulse">
      {onlineStatus}
    </p>

    <div className="mt-3 flex justify-center gap-2">
      <div className="w-2 h-2 rounded-full bg-[#0052FF] animate-bounce" />
      <div
        className="w-2 h-2 rounded-full bg-[#0052FF] animate-bounce"
        style={{ animationDelay: "0.15s" }}
      />
      <div
        className="w-2 h-2 rounded-full bg-[#0052FF] animate-bounce"
        style={{ animationDelay: "0.3s" }}
      />
    </div>
  </div>
)}


<button
  onClick={async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    const readyUsername = getReadyUsername();
    if (!readyUsername) return;

    if (matchmaking) {
      setMatchmaking(false);
      socketRef.current?.emit("cancel-matchmaking");
    }

const code = Math.random()
  .toString(36)
  .substring(2, 6)
  .toUpperCase();

setGameMode("online");
gameModeRef.current = "online";
setRoomCode(code);
setShowJoinRoom(false);
setOnlineStatus("WAITING FOR PLAYER...");

socketRef.current?.emit("create-room", {
  roomCode: code,
  address,
  username: readyUsername,
});
  }}
  className={`mt-4 w-full h-[54px] rounded-full border border-[#0052FF]/50 text-[#0052FF] font-black tracking-[0.18em] ${
    !isConnected ? "opacity-45" : ""
  }`}
>
  CREATE ROOM
</button>

<button
  onClick={() => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    const readyUsername = getReadyUsername();
    if (!readyUsername) return;

    if (matchmaking) {
      setMatchmaking(false);
      socketRef.current?.emit("cancel-matchmaking");
    }

    setShowJoinRoom(true);
    setRoomCode(null);
    setOnlineStatus(null);
  }}
  className={`mt-4 w-full h-[54px] rounded-full border border-white/15 text-white/70 font-black tracking-[0.18em] ${
    !isConnected ? "opacity-45" : ""
  }`}
>
  JOIN ROOM
</button>

{roomCode && (
  <div className="mt-6">
    <p className="text-white/35 text-[10px] tracking-[0.3em]">
      ROOM CODE
    </p>

    <div className="mt-2 text-[#0052FF] text-3xl font-black tracking-[0.25em]">
      {roomCode}
    </div>

    <p className="mt-2 text-white/30 text-[10px] tracking-[0.25em]">
      SHARE THIS CODE WITH A FRIEND ON {socketRegion}
    </p>
<button
  onClick={() => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    }
  }}
  className="mt-3 px-5 py-2 rounded-full border border-[#0052FF]/40 text-[#0052FF] text-[10px] font-black tracking-[0.25em]"
>
  {copied ? "COPIED ✓" : "COPY CODE"}
</button>

  </div>
)}

{roomCode && (
  <div className="mt-4">
    <p className="text-[#0052FF] text-[10px] font-black tracking-[0.25em] animate-pulse">
      WAITING FOR PLAYER...
    </p>

    <div className="mt-2 flex justify-center gap-2">
      <div className="w-2 h-2 rounded-full bg-[#0052FF] animate-bounce" />
      <div
        className="w-2 h-2 rounded-full bg-[#0052FF] animate-bounce"
        style={{ animationDelay: "0.15s" }}
      />
      <div
        className="w-2 h-2 rounded-full bg-[#0052FF] animate-bounce"
        style={{ animationDelay: "0.3s" }}
      />
    </div>
  </div>
)}

{showJoinRoom && (
  <div className="mt-6">
    <p className="text-white/35 text-[10px] tracking-[0.3em]">
      ENTER CODE
    </p>

    <input
  value={joinCode}
  onChange={(e) =>
    setJoinCode(e.target.value.toUpperCase())
  }
  maxLength={4}
  placeholder="ABCD"
  className="
    mt-3
    w-full
    h-[48px]
    rounded-xl
    bg-black/40
    border
    border-white/10
    text-center
    text-white
    font-black
    tracking-[0.25em]
    outline-none
  "
/>

<button
  onClick={async () => {
    if (!joinCode || !address) return;

    const readyUsername = getReadyUsername();
    if (!readyUsername) return;

    const cleanCode = joinCode.toUpperCase();

    setGameMode("online");
    gameModeRef.current = "online";
    setIsHost(false);
    isHostRef.current = false;
    roomIdRef.current = cleanCode;
    setOnlineStatus("OPPONENT FOUND");

    socketRef.current?.emit("join-room", {
      roomCode: cleanCode,
      address,
      username: readyUsername,
    });
  }}
  className="
    mt-3
    w-full
    h-[48px]
    rounded-full
    bg-[#0052FF]
    text-white
    font-black
    tracking-[0.2em]
  "
>
  JOIN
</button>
{onlineStatus && (
  <div className="mt-5">
    <p className="text-[#0052FF] text-xs font-black tracking-[0.25em] animate-pulse">
      {onlineStatus}
    </p>

    <div className="mt-3 flex justify-center gap-2">
      <div className="w-2 h-2 rounded-full bg-[#0052FF] animate-bounce" />
      <div
        className="w-2 h-2 rounded-full bg-[#0052FF] animate-bounce"
        style={{ animationDelay: "0.15s" }}
      />
      <div
        className="w-2 h-2 rounded-full bg-[#0052FF] animate-bounce"
        style={{ animationDelay: "0.3s" }}
      />
    </div>
  </div>
)}


  </div>
)}

<button
  onClick={() => {
    if (matchmaking) {
      setMatchmaking(false);
      setMatchFound(false);
      setOpponentAddress(null);
      setOpponentUsername(null);
      socketRef.current?.emit("cancel-matchmaking");
    }

    setShowOnlineSoon(false);
    setRoomCode(null);
    setShowJoinRoom(false);
    setOnlineStatus(null);
    setJoinCode("");
    setActiveRoomId(null);
  }}
  className="mt-8 text-white/35 text-xs font-black tracking-[0.25em]"
>
  BACK
</button>
    </div>
  </div>
)}

      <div
        className={`absolute inset-0 z-10 flex items-center justify-center overflow-hidden transition ${
          screen === "game" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`relative ${
            arena === "base"
              ? "drop-shadow-[0_0_38px_rgba(239,68,68,0.28)]"
              : arena === "space"
              ? "drop-shadow-[0_0_38px_rgba(34,211,238,0.28)]"
              : arena === "temple"
              ? "drop-shadow-[0_0_38px_rgba(251,191,36,0.28)]"
              : ""
          }`}
          style={{
            width: "min(100vw, calc(100dvh * 400 / 700), 430px)",
            aspectRatio: "400 / 700",
            maxHeight: "100dvh",
          }}
        >
          {arena === "base" && (
            <>
              <div className="pointer-events-none absolute left-1/2 top-[-20px] z-[1] hidden h-[10px] w-[calc(100%+210px)] -translate-x-1/2 rounded-full bg-red-500/60 shadow-[0_0_28px_rgba(239,68,68,0.95)] sm:block" />
              <div className="pointer-events-none absolute bottom-[-20px] left-1/2 z-[1] hidden h-[10px] w-[calc(100%+210px)] -translate-x-1/2 rounded-full bg-[#0052FF]/65 shadow-[0_0_28px_rgba(0,82,255,0.95)] sm:block" />

              <div className="pointer-events-none absolute bottom-[5%] left-[-128px] top-[5%] z-[1] hidden w-[112px] flex-col justify-around sm:flex">
                {["BASE", "BUILD", "ONCHAIN", "BASE", "BUILD"].map((label, index) => (
                  <div key={`left-${label}-${index}`} className="relative h-[58px] rounded-xl border border-red-400/45 bg-black/75 shadow-[0_0_24px_rgba(239,68,68,0.28)]">
                    <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(0,82,255,0.18),rgba(0,0,0,0)_62%)]" />
                    <div className="absolute -top-5 left-2 right-2 h-4 rounded-t-lg bg-[#050814] border-t border-x border-[#0052FF]/25" />
                    <div className="absolute inset-x-2 top-2 h-[2px] bg-[#0052FF]/70 shadow-[0_0_10px_rgba(0,82,255,0.9)]" />
                    <div className={`relative flex h-full items-center justify-center text-[13px] font-black tracking-[0.18em] ${
                      index % 2 === 0 ? "text-red-300" : "text-[#7db1ff]"
                    }`}>
                      {label}
                    </div>
                    <div className="absolute -bottom-3 left-2 right-2 flex justify-center gap-[3px] opacity-40">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <span key={i} className="h-2 w-1 rounded-full bg-white/60" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pointer-events-none absolute bottom-[5%] right-[-128px] top-[5%] z-[1] hidden w-[112px] flex-col justify-around sm:flex">
                {["BOING", "BATTLE", "BASE", "ARCADE", "BASE"].map((label, index) => (
                  <div key={`right-${label}-${index}`} className="relative h-[58px] rounded-xl border border-[#0052FF]/45 bg-black/75 shadow-[0_0_24px_rgba(0,82,255,0.28)]">
                    <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.16),rgba(0,0,0,0)_62%)]" />
                    <div className="absolute -top-5 left-2 right-2 h-4 rounded-t-lg bg-[#050814] border-t border-x border-red-400/25" />
                    <div className="absolute inset-x-2 top-2 h-[2px] bg-red-400/70 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
                    <div className={`relative flex h-full items-center justify-center text-[13px] font-black tracking-[0.18em] ${
                      index % 2 === 0 ? "text-red-300" : "text-[#7db1ff]"
                    }`}>
                      {label}
                    </div>
                    <div className="absolute -bottom-3 left-2 right-2 flex justify-center gap-[3px] opacity-40">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <span key={i} className="h-2 w-1 rounded-full bg-white/60" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {arena === "space" && (
            <>
              <div className="pointer-events-none absolute left-1/2 top-[-20px] z-[1] hidden h-[8px] w-[calc(100%+180px)] -translate-x-1/2 rounded-full bg-cyan-300/60 shadow-[0_0_28px_rgba(34,211,238,0.95)] sm:block" />
              <div className="pointer-events-none absolute bottom-[-20px] left-1/2 z-[1] hidden h-[8px] w-[calc(100%+180px)] -translate-x-1/2 rounded-full bg-[#0052FF]/65 shadow-[0_0_28px_rgba(0,82,255,0.95)] sm:block" />
              <div className="pointer-events-none absolute bottom-[8%] left-[-108px] top-[8%] z-[1] hidden w-[92px] flex-col justify-around sm:flex">
                {["ORBIT", "MOON", "BASE", "STAR"].map((label) => (
                  <div key={`space-left-${label}`} className="rounded-xl border border-cyan-300/45 bg-black/70 px-3 py-3 text-center text-[11px] font-black tracking-[0.18em] text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.25)]">
                    {label}
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute bottom-[8%] right-[-108px] top-[8%] z-[1] hidden w-[92px] flex-col justify-around sm:flex">
                {["NOVA", "CHAIN", "VOID", "BASE"].map((label) => (
                  <div key={`space-right-${label}`} className="rounded-xl border border-[#0052FF]/45 bg-black/70 px-3 py-3 text-center text-[11px] font-black tracking-[0.18em] text-blue-200 shadow-[0_0_22px_rgba(0,82,255,0.25)]">
                    {label}
                  </div>
                ))}
              </div>
            </>
          )}

          {arena === "temple" && (
            <>
              <div className="pointer-events-none absolute left-1/2 top-[-20px] z-[1] hidden h-[8px] w-[calc(100%+170px)] -translate-x-1/2 rounded-full bg-amber-300/60 shadow-[0_0_28px_rgba(251,191,36,0.95)] sm:block" />
              <div className="pointer-events-none absolute bottom-[-20px] left-1/2 z-[1] hidden h-[8px] w-[calc(100%+170px)] -translate-x-1/2 rounded-full bg-amber-500/60 shadow-[0_0_28px_rgba(245,158,11,0.95)] sm:block" />
              <div className="pointer-events-none absolute bottom-[8%] left-[-104px] top-[8%] z-[1] hidden w-[88px] flex-col justify-around sm:flex">
                {["RUNE", "GOLD", "CHAIN", "BASE"].map((label) => (
                  <div key={`temple-left-${label}`} className="rounded-xl border border-amber-300/45 bg-black/75 px-3 py-3 text-center text-[11px] font-black tracking-[0.18em] text-amber-200 shadow-[0_0_22px_rgba(251,191,36,0.25)]">
                    {label}
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute bottom-[8%] right-[-104px] top-[8%] z-[1] hidden w-[88px] flex-col justify-around sm:flex">
                {["VAULT", "BLOCK", "ALTAR", "BASE"].map((label) => (
                  <div key={`temple-right-${label}`} className="rounded-xl border border-yellow-500/45 bg-black/75 px-3 py-3 text-center text-[11px] font-black tracking-[0.18em] text-yellow-200 shadow-[0_0_22px_rgba(251,191,36,0.25)]">
                    {label}
                  </div>
                ))}
              </div>
            </>
          )}

          <canvas
            ref={canvasRef}
            width={400}
            height={700}
            className={`relative z-10 block w-full h-full rounded-none sm:rounded-3xl touch-none ${
              arena === "base"
                ? "border border-red-400/60 shadow-[0_0_28px_rgba(239,68,68,0.45)]"
                : arena === "space"
                ? "border border-cyan-300/60 shadow-[0_0_28px_rgba(34,211,238,0.42)]"
                : arena === "temple"
                ? "border border-amber-300/60 shadow-[0_0_28px_rgba(251,191,36,0.42)]"
                : "border border-white/15"
            }`}
          />
        </div>
      </div>

      {goalFlash && (
        <div className={`absolute inset-0 ${activeArenaTheme.flashClass} pointer-events-none z-40 flex items-center justify-center`}>
          <div className={`${activeArenaTheme.countdownClass} ${activeArenaTheme.countdownGlowClass} animate-[countPop_0.7s_ease-out] text-4xl sm:text-6xl font-black tracking-[0.22em] opacity-90`}>
            {arena === "base"
              ? "NEON GOAL"
              : arena === "space"
              ? "ORBIT GOAL"
              : arena === "temple"
              ? "RUNE GOAL"
              : "GOAL"}
          </div>
        </div>
      )}

      {countdown !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none">
          <div className={`${activeArenaTheme.readyClass} text-sm font-black tracking-[0.5em] mb-3`}>
            {activeArenaTheme.readyText}
          </div>

<div
  key={countdown}
  className={`font-black animate-[countPop_0.7s_ease-out] ${activeArenaTheme.countdownGlowClass} ${
    countdown === "BATTLE!"
      ? `${activeArenaTheme.countdownClass} text-6xl tracking-[0.15em]`
      : `${activeArenaTheme.countdownClass} text-8xl`
  }`}
>
  {countdown}
</div>

          <div className={`mt-4 ${arena === "classic" ? "text-white/35" : activeArenaTheme.countdownClass} text-[10px] tracking-[0.35em] opacity-60`}>
            {activeArenaTheme.subText}
          </div>
        </div>
      )}


      {matchFound && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-black px-5 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,82,255,0.20),rgba(0,0,0,0)_56%)]" />
          <div className="absolute inset-0 opacity-[0.08]">
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,82,255,.55) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,82,255,.55) 1px, transparent 1px)
                `,
                backgroundSize: "42px 42px",
              }}
            />
          </div>

          <div className="absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#0052FF]/20 animate-[spin_32s_linear_infinite]" />
          <div className="absolute left-1/2 top-1/2 h-[410px] w-[410px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
          <div className="absolute left-1/2 top-1/2 h-[190px] w-[190px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0052FF]/25 blur-[110px]" />

          <div className="relative z-10 w-full max-w-[560px] rounded-[2rem] border border-[#0052FF]/25 bg-[#020713]/90 p-6 shadow-[0_0_70px_rgba(0,82,255,0.25)] backdrop-blur-xl animate-[matchPop_0.55s_ease-out]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#0052FF]/60 bg-[#0052FF]/10 shadow-[0_0_40px_rgba(0,82,255,0.55)]">
              <img
                src="/base.png"
                alt="Base"
                className="h-11 w-11 object-contain drop-shadow-[0_0_24px_rgba(0,82,255,1)]"
              />
            </div>

            <div className="text-[#0052FF] text-[10px] font-black tracking-[0.55em]">
              BASE MULTIPLAYER
            </div>

            <h1 className="mt-3 text-white text-4xl sm:text-5xl font-black tracking-[0.18em] drop-shadow-[0_0_24px_rgba(255,255,255,0.22)]">
              MATCH FOUND
            </h1>

            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="min-w-0 rounded-2xl border border-[#0052FF]/25 bg-black/35 px-3 py-4 shadow-[inset_0_0_24px_rgba(0,82,255,0.08)]">
                <div className="text-[8px] font-black tracking-[0.35em] text-[#0052FF]">
                  YOU
                </div>
                <div
                  className="mt-2 truncate text-white text-xl sm:text-2xl font-black tracking-[0.08em]"
                  title={playerDisplayName}
                >
                  {playerDisplayName}
                </div>
              </div>

              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#0052FF]/25 blur-xl" />
                <div className="relative text-[#0052FF] text-3xl font-black drop-shadow-[0_0_24px_rgba(0,82,255,1)]">
                  VS
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-red-400/25 bg-black/35 px-3 py-4 shadow-[inset_0_0_24px_rgba(239,68,68,0.08)]">
                <div className="text-[8px] font-black tracking-[0.35em] text-red-400">
                  RIVAL
                </div>
                <div
                  className="mt-2 truncate text-white text-xl sm:text-2xl font-black tracking-[0.08em]"
                  title={rivalDisplayName}
                >
                  {rivalDisplayName}
                </div>
              </div>
            </div>

            {selectedMatchArena ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[9px] font-black tracking-[0.42em] text-white/35">
                  ARENA LOCKED
                </div>
                <div className="mt-2 text-[#0052FF] text-xl font-black tracking-[0.18em] drop-shadow-[0_0_20px_rgba(0,82,255,0.8)]">
                  {getArenaLabel(selectedMatchArena)}
                </div>
                <div className="mt-2 text-white/35 text-[10px] font-black tracking-[0.3em]">
                  BATTLE STARTING
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[9px] font-black tracking-[0.42em] text-white/35">
                  NEXT STEP
                </div>
                <div className="mt-2 text-[#0052FF] text-sm font-black tracking-[0.28em]">
                  ARENA VOTING
                </div>
                <div className="mt-2 text-white/35 text-[10px] tracking-[0.28em]">
                  BOTH PLAYERS CHOOSE MAP
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#0052FF] shadow-[0_0_12px_rgba(0,82,255,0.9)] animate-bounce" />
              <div
                className="h-2 w-2 rounded-full bg-[#0052FF] shadow-[0_0_12px_rgba(0,82,255,0.9)] animate-bounce"
                style={{ animationDelay: "0.15s" }}
              />
              <div
                className="h-2 w-2 rounded-full bg-[#0052FF] shadow-[0_0_12px_rgba(0,82,255,0.9)] animate-bounce"
                style={{ animationDelay: "0.3s" }}
              />
            </div>
          </div>
        </div>
      )}

      {showArenaVote && (
        <div className="absolute inset-0 z-[1100] flex items-center justify-center overflow-hidden bg-black/94 px-4 text-center backdrop-blur-md">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,82,255,0.18),rgba(0,0,0,0)_58%)]" />
          <div className="absolute inset-0 opacity-[0.08]">
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,82,255,.5) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,82,255,.5) 1px, transparent 1px)
                `,
                backgroundSize: "44px 44px",
              }}
            />
          </div>

          <div className="relative z-10 w-full max-w-[760px] rounded-[2rem] border border-[#0052FF]/25 bg-[#030712]/92 p-5 shadow-[0_0_70px_rgba(0,82,255,0.25)] sm:p-7">
            <div className="text-[#0052FF] text-[10px] font-black tracking-[0.48em]">
              MATCH FOUND
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="min-w-0 rounded-2xl border border-white/10 bg-black/35 px-3 py-3">
                <div className="text-[8px] font-black tracking-[0.34em] text-[#0052FF]">
                  YOU
                </div>
                <div className="mt-1 truncate text-white text-lg font-black tracking-[0.08em]">
                  {playerDisplayName}
                </div>
              </div>

              <div className="text-[#0052FF] text-2xl font-black drop-shadow-[0_0_20px_rgba(0,82,255,1)]">
                VS
              </div>

              <div className="min-w-0 rounded-2xl border border-white/10 bg-black/35 px-3 py-3">
                <div className="text-[8px] font-black tracking-[0.34em] text-red-400">
                  RIVAL
                </div>
                <div className="mt-1 truncate text-white text-lg font-black tracking-[0.08em]">
                  {rivalDisplayName}
                </div>
              </div>
            </div>

            <h2 className="mt-6 text-white text-3xl sm:text-4xl font-black tracking-[0.18em]">
              CHOOSE ARENA
            </h2>

            <div className="mt-2 text-white/35 text-[10px] tracking-[0.28em]">
              BOTH PLAYERS VOTE • DIFFERENT VOTES = RANDOM PICK
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ARENA_OPTIONS.map((item) => {
                const selected = votedArena === item.key;
                const hostVoted = arenaVotes.host === item.key;
                const guestVoted = arenaVotes.guest === item.key;
                const myVote = isHostRef.current ? arenaVotes.host : arenaVotes.guest;
                const rivalVote = isHostRef.current ? arenaVotes.guest : arenaVotes.host;
                const meVotedThis = myVote === item.key;
                const rivalVotedThis = rivalVote === item.key;

                return (
                  <button
                    key={`vote-${item.key}`}
                    onClick={() => {
                      if (!roomIdRef.current) return;
                      setVotedArena(item.key);
                      socketRef.current?.emit("vote-arena", {
                        roomCode: roomIdRef.current,
                        arena: item.key,
                      });
                    }}
                    className={`relative min-h-[150px] overflow-hidden rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                      selected ? item.selectedClass : "border-white/10 text-white/60 hover:border-white/30"
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.previewClass} opacity-80`} />
                    <div className="absolute inset-x-3 top-3 h-[3px] rounded-full bg-white/20" />
                    <div className={`absolute bottom-3 right-3 h-3 w-3 rounded-full ${item.dot} shadow-[0_0_16px_rgba(255,255,255,0.35)]`} />

                    {selected && (
                      <div className="absolute right-3 top-3 rounded-full bg-white px-2 py-1 text-[8px] font-black tracking-[0.16em] text-black">
                        VOTED
                      </div>
                    )}

                    <div className="relative z-10 flex h-full flex-col">
                      <div className="text-[14px] font-black tracking-[0.16em] text-white">
                        {item.title}
                      </div>
                      <div className="mt-1 text-[8px] font-black tracking-[0.22em] text-white/45">
                        {item.subtitle}
                      </div>

                      <div className="mt-auto space-y-1 pt-10 text-[8px] font-black tracking-[0.2em]">
                        <div className={meVotedThis ? "text-white" : "text-white/25"}>
                          YOU {meVotedThis ? "✓" : "-"}
                        </div>
                        <div className={rivalVotedThis ? "text-white" : "text-white/25"}>
                          RIVAL {rivalVotedThis ? "✓" : "-"}
                        </div>
                        <div className="text-white/15">
                          {hostVoted || guestVoted ? "VOTE ACTIVE" : "NO VOTE"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <div className="text-[10px] font-black tracking-[0.3em] text-white/35">
                {votedArena ? `YOU VOTED ${getArenaLabel(votedArena)}` : "WAITING FOR YOUR VOTE"}
              </div>

              {selectedMatchArena ? (
                <div className="mt-2 text-[#0052FF] text-sm font-black tracking-[0.28em] animate-pulse">
                  ARENA LOCKED: {getArenaLabel(selectedMatchArena)}
                </div>
              ) : (
                <div className="mt-2 flex justify-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#0052FF] animate-bounce" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#0052FF] animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#0052FF] animate-bounce" style={{ animationDelay: "0.3s" }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {opponentLeft && (
        <div className="absolute inset-0 z-[999] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center px-8 text-center">
          <h1 className="text-4xl font-black text-white mb-3">
            OPPONENT LEFT
          </h1>

          <p className="text-[#0052FF] text-xs font-black tracking-[0.3em] mb-8">
            YOUR OPPONENT DISCONNECTED
          </p>

          <button
            onClick={() => {
              setOpponentLeft(false);
              goMainMenu();
            }}
            className="px-8 py-4 rounded-full bg-[#0052FF] text-white font-black tracking-[0.2em] shadow-[0_0_30px_rgba(0,82,255,0.45)]"
          >
            MAIN MENU
          </button>
        </div>
      )}

      {winner && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-50">
          <h1 className="text-4xl font-black text-white mb-2">{winner}</h1>

          <div className="mb-3 max-w-[90vw] text-center text-white/80 text-lg font-black tracking-[0.08em]">
            {gameMode === "online" ? rivalDisplayName : "AI"} {finalScore?.ai ?? scoreRef.current.ai} ◇ {finalScore?.player ?? scoreRef.current.player} {gameMode === "online" ? playerDisplayName : "YOU"}
          </div>

          <p className="mb-8 text-[#0052FF] text-xs font-black tracking-[0.35em]">
            FINAL SCORE
          </p>

          <div className="flex flex-col items-center">
            <button
              onClick={handlePlayAgain}
              disabled={playAgainWaiting}
              className="px-7 py-3 rounded-full bg-[#0052FF] hover:bg-blue-500 disabled:opacity-50 font-black text-white tracking-[0.2em] shadow-[0_0_30px_rgba(0,82,255,0.45)]"
            >
              {playAgainWaiting ? "WAITING P2" : "PLAY AGAIN"}
            </button>

            <button
              onClick={goMainMenu}
              className="mt-4 px-7 py-3 rounded-full border border-white/20 text-white/70 font-black tracking-[0.2em] hover:bg-white/10 transition"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}
    </main>
  );
}