"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { io } from "socket.io-client";


const ENERGY_CONTRACT_ADDRESS =
  "0x55894E2e9B29dad1b526C7F7c5d2d5E8e1B9D7dB" as const;

const ENERGY_ABI = [
  {
    inputs: [],
    name: "activateEnergy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "isEnergyActive",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "nextActivation",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;


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
const publicClient = usePublicClient();
const { data: walletClient } = useWalletClient();

const [baseEnergyActive, setBaseEnergyActive] = useState(false);
const [baseEnergyLoading, setBaseEnergyLoading] = useState(false);
const [baseEnergyStatus, setBaseEnergyStatus] = useState<string | null>(null);
const [socketRegion, setSocketRegion] = useState<SocketRegion>("EU");
const socketRegionRef = useRef<SocketRegion>("EU");
  const [showSplash, setShowSplash] = useState(false);
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

const formatEnergyTimeLeft = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours <= 0) return `${minutes}M LEFT`;
  return `${hours}H ${minutes}M LEFT`;
};

const checkBaseEnergy = async () => {
  if (!address || !publicClient) {
    setBaseEnergyActive(false);
    setBaseEnergyStatus("CONNECT WALLET TO ACTIVATE ENERGY");
    return;
  }

  try {
    const active = await publicClient.readContract({
      address: ENERGY_CONTRACT_ADDRESS,
      abi: ENERGY_ABI,
      functionName: "isEnergyActive",
      args: [address],
    });

    setBaseEnergyActive(Boolean(active));

    if (active) {
      const left = await publicClient.readContract({
        address: ENERGY_CONTRACT_ADDRESS,
        abi: ENERGY_ABI,
        functionName: "nextActivation",
        args: [address],
      });

      setBaseEnergyStatus(
        `ENERGY ACTIVE • ${formatEnergyTimeLeft(Number(left))}`
      );
    } else {
      setBaseEnergyStatus("ACTIVATE BASE ENERGY TO PLAY");
    }
  } catch (err) {
    console.error("ENERGY CHECK FAILED", err);
    setBaseEnergyActive(false);
    setBaseEnergyStatus("ENERGY CHECK FAILED");
  }
};

const handleActivateBaseEnergy = async () => {
  if (!isConnected || !address) {
    openConnectModal?.();
    return;
  }

  if (!walletClient || !publicClient) {
    setBaseEnergyStatus("WALLET NOT READY");
    return;
  }

  try {
    setBaseEnergyLoading(true);
    setBaseEnergyStatus("CONFIRM TX IN WALLET");

    const hash = await walletClient.writeContract({
      address: ENERGY_CONTRACT_ADDRESS,
      abi: ENERGY_ABI,
      functionName: "activateEnergy",
      account: address,
    });

    setBaseEnergyStatus("ACTIVATING ENERGY...");

    await publicClient.waitForTransactionReceipt({ hash });

    setBaseEnergyActive(true);
    setBaseEnergyStatus("ENERGY ACTIVE • GAME UNLOCKED");
    navigator.vibrate?.(40);
  } catch (err) {
    console.error("ENERGY TX FAILED", err);
    setBaseEnergyStatus("TX FAILED OR CANCELLED");
  } finally {
    setBaseEnergyLoading(false);
  }
};

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
  checkBaseEnergy();

  const timer = setInterval(() => {
    checkBaseEnergy();
  }, 60_000);

  return () => clearInterval(timer);
}, [address, publicClient]);

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


  // Mobile/Base App: skip splash overlay to avoid getting stuck on older WebViews.
  useEffect(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    if (screen !== "game") return;

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
  }, [screen]);


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

  const canPlay = baseEnergyActive || gameMode === "ai";

  const mobileStartAi = (difficulty: "easy" | "normal" | "hard") => {
    setAiDifficulty(difficulty);
    aiDifficultyRef.current = difficulty;
    setGameMode("ai");
    gameModeRef.current = "ai";
    setShowDifficulty(false);
    startGame();
  };

  const mobileFindMatch = () => {
    if (!isConnected || !address) {
      openConnectModal?.();
      return;
    }

    if (!baseEnergyActive) {
      setOnlineStatus("ACTIVATE BASE ENERGY FIRST");
      navigator.vibrate?.(35);
      return;
    }

    const readyUsername = getReadyUsername();
    if (!readyUsername) return;

    setGameMode("online");
    gameModeRef.current = "online";
    setMatchFound(false);
    setOpponentLeft(false);
    setRoomCode(null);
    setOnlineStatus("SEARCHING OPPONENT...");

    socketRef.current?.emit("find-match", {
      address,
      username: readyUsername,
    });
  };

  const mobileCancelMatch = () => {
    setMatchmaking(false);
    setOnlineStatus(null);
    setMatchFound(false);
    setOpponentAddress(null);
    setOpponentUsername(null);
    socketRef.current?.emit("cancel-matchmaking");
  };

  const tapGuardRef = useRef(0);

  const runMobileTap = (handler: () => void) => {
    const now = Date.now();
    if (now - tapGuardRef.current < 280) return;
    tapGuardRef.current = now;
    handler();
  };

  const mobileTap = (handler: () => void) => ({
    onTouchStart: (e: any) => {
      e.stopPropagation();
      runMobileTap(handler);
    },
    onPointerDown: (e: any) => {
      e.stopPropagation();
      runMobileTap(handler);
    },
    onMouseDown: (e: any) => {
      e.stopPropagation();
      runMobileTap(handler);
    },
    onClick: (e: any) => {
      e.stopPropagation();
      runMobileTap(handler);
    },
  });


  const mobileLink = (href: string, handler: () => void) => ({
    href,
    onTouchStart: (e: any) => {
      e.stopPropagation();
      runMobileTap(handler);
    },
    onPointerDown: (e: any) => {
      e.stopPropagation();
      runMobileTap(handler);
    },
    onClick: (e: any) => {
      // Do NOT preventDefault here.
      // iOS/Base App WebView sometimes drops React click/touch handlers,
      // so the real href query action must remain as a native fallback.
      e.stopPropagation();
      runMobileTap(handler);
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (!action) return;

    const clearAction = () => {
      window.history.replaceState(null, "", "/mobile");
    };

    const arenaParam = params.get("arena") as Arena | null;
    const regionParam = params.get("region") as SocketRegion | null;
    const difficultyParam = params.get("difficulty") as
      | "easy"
      | "normal"
      | "hard"
      | null;

    if (action === "menu") {
      goMainMenu();
      clearAction();
      return;
    }

    if (action === "region" && (regionParam === "EU" || regionParam === "US")) {
      setSocketRegion(regionParam);
      clearAction();
      return;
    }

    if (
      action === "arena" &&
      arenaParam &&
      ["classic", "base", "space", "temple"].includes(arenaParam)
    ) {
      setArena(arenaParam);
      arenaRef.current = arenaParam;
      clearAction();
      return;
    }

    if (action === "difficulty") {
      setShowDifficulty(true);
      clearAction();
      return;
    }

    if (
      action === "start-ai" &&
      difficultyParam &&
      ["easy", "normal", "hard"].includes(difficultyParam)
    ) {
      mobileStartAi(difficultyParam);
      clearAction();
      return;
    }

    if (action === "online") {
      mobileFindMatch();
      clearAction();
      return;
    }

    if (action === "cancel") {
      mobileCancelMatch();
      clearAction();
      return;
    }

    if (action === "howto") {
      setShowHowToPlay(true);
      clearAction();
      return;
    }

    if (action === "close-howto") {
      setShowHowToPlay(false);
      clearAction();
      return;
    }

    if (action === "close-difficulty") {
      setShowDifficulty(false);
      clearAction();
      return;
    }

    if (action === "energy") {
      handleActivateBaseEnergy();
      clearAction();
      return;
    }

    if (action === "play-again") {
      handlePlayAgain();
      clearAction();
    }
  }, [
    address,
    isConnected,
    baseEnergyActive,
    walletClient,
    publicClient,
    socketRegion,
    usernameInput,
    matchmaking,
  ]);

  return (
    <main
      className={`fixed inset-0 w-screen h-[100dvh] bg-black text-white select-none ${
        screen === "game" ? "overflow-hidden overscroll-none" : "overflow-y-auto overscroll-y-contain"
      } ${screenShake ? "goal-shake" : ""}`}
      style={{
        touchAction: screen === "game" ? "none" : "auto",
        WebkitTapHighlightColor: "transparent",
        WebkitOverflowScrolling: "touch",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      } as any}
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
        <section className="relative z-10 min-h-[100dvh] w-full flex flex-col px-4 py-4 pb-10">
          <img
            src="/splash.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm"
          />
          <div className="absolute inset-0 bg-black/80" />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-[0.35em] text-[#0052FF]">
                MOBILE MODE
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">
                BOING BATTLE
              </h1>
            </div>

            <button
              type="button"
              {...mobileTap(() => {
                openConnectModal?.();
              })}
              className="h-11 px-4 rounded-2xl border border-white/15 bg-white/5 text-[10px] font-black tracking-[0.18em] active:scale-95"
            >
              {isConnected && address
                ? `${address.slice(0, 4)}...${address.slice(-3)}`
                : "WALLET"}
            </button>
          </div>

          <div className="relative z-10 mt-4 rounded-[28px] border border-white/10 bg-black/45 p-3 shadow-[0_0_35px_rgba(0,82,255,0.20)]">
            <div className="grid grid-cols-2 gap-2">
              <a
                {...mobileLink("/mobile?action=region&region=EU", () => setSocketRegion("EU"))}
                className={`flex h-11 items-center justify-center rounded-2xl text-xs font-black tracking-[0.18em] active:scale-95 ${
                  socketRegion === "EU"
                    ? "bg-[#0052FF] text-white"
                    : "bg-white/5 text-white/50 border border-white/10"
                }`}
              >
                EU
              </a>
              <a
                {...mobileLink("/mobile?action=region&region=US", () => setSocketRegion("US"))}
                className={`flex h-11 items-center justify-center rounded-2xl text-xs font-black tracking-[0.18em] active:scale-95 ${
                  socketRegion === "US"
                    ? "bg-[#0052FF] text-white"
                    : "bg-white/5 text-white/50 border border-white/10"
                }`}
              >
                US
              </a>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                value={usernameInput}
                onChange={(e) => {
                  const clean = cleanUsername(e.target.value);
                  setUsernameInput(clean);
                  setUsernameWarning(null);
                }}
                placeholder="USERNAME"
                inputMode="text"
                autoCapitalize="characters"
                className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/60 px-4 text-center text-sm font-black tracking-[0.18em] text-white outline-none placeholder:text-white/25"
              />
              <button
                type="button"
                {...mobileTap(() => {
                  const ready = getReadyUsername();
                  if (ready) navigator.vibrate?.(20);
                })}
                className="h-12 px-4 rounded-2xl bg-white text-black text-xs font-black tracking-[0.16em] active:scale-95"
              >
                SAVE
              </button>
            </div>

            {(usernameWarning || onlineStatus || baseEnergyStatus) && (
              <p className="mt-3 text-center text-[10px] font-black tracking-[0.18em] text-white/55">
                {usernameWarning || onlineStatus || baseEnergyStatus}
              </p>
            )}
          </div>

          <div className="relative z-10 mt-3 grid grid-cols-2 gap-2">
            {ARENA_OPTIONS.map((item) => (
              <a
                key={item.key}
                {...mobileLink(`/mobile?action=arena&arena=${item.key}`, () => {
                  setArena(item.key);
                  arenaRef.current = item.key;
                  navigator.vibrate?.(15);
                })}
                className={`h-[74px] rounded-[22px] border p-3 text-left active:scale-95 bg-gradient-to-br ${item.previewClass} ${
                  arena === item.key
                    ? item.selectedClass
                    : "border-white/10 text-white/45"
                }`}
              >
                <div className={`h-2 w-2 rounded-full ${item.dot}`} />
                <div className="mt-2 text-xs font-black tracking-[0.15em]">
                  {item.title}
                </div>
                <div className="mt-1 text-[9px] font-black tracking-[0.15em] opacity-60">
                  {item.subtitle}
                </div>
              </a>
            ))}
          </div>

          <div className="relative z-10 mt-auto space-y-3 pb-2">
            {!baseEnergyActive && (
              <a
                {...mobileLink("/mobile?action=energy", handleActivateBaseEnergy)}
                aria-disabled={baseEnergyLoading}
                className="h-14 w-full rounded-[24px] bg-white text-black text-sm font-black tracking-[0.22em] active:scale-95 disabled:opacity-50"
              >
                {baseEnergyLoading ? "CONFIRMING..." : "ACTIVATE ENERGY"}
              </a>
            )}

            <a
              {...mobileLink("/mobile?action=difficulty", () => setShowDifficulty(true))}
              className="flex h-16 w-full items-center justify-center rounded-[28px] bg-[#0052FF] text-white text-base font-black tracking-[0.22em] shadow-[0_0_35px_rgba(0,82,255,0.45)] active:scale-95"
            >
              PLAY VS AI
            </a>

            <a
              {...mobileLink("/mobile?action=online", mobileFindMatch)}
              aria-disabled={matchmaking}
              className="flex h-16 w-full items-center justify-center rounded-[28px] border border-white/15 bg-white/5 text-white text-base font-black tracking-[0.22em] active:scale-95 opacity-100"
            >
              {matchmaking ? "SEARCHING..." : "ONLINE 1V1"}
            </a>

            {matchmaking && (
              <a
                {...mobileLink("/mobile?action=cancel", mobileCancelMatch)}
                className="flex h-12 w-full items-center justify-center rounded-[22px] border border-red-400/25 bg-red-500/10 text-red-200 text-xs font-black tracking-[0.2em] active:scale-95"
              >
                CANCEL SEARCH
              </a>
            )}

            <a
              {...mobileLink("/mobile?action=howto", () => setShowHowToPlay(true))}
              className="flex h-11 w-full items-center justify-center rounded-[20px] text-white/45 text-xs font-black tracking-[0.22em] active:scale-95"
            >
              HOW TO PLAY
            </a>
          </div>
        </section>
      )}

      {!showSplash && screen === "game" && (
        <section className="relative h-[100dvh] w-screen flex items-center justify-center bg-black overflow-hidden">
          <div
            className="relative flex items-center justify-center"
            style={{
              width: "min(100vw, calc(100dvh * 0.5714))",
              height: "min(100dvh, calc(100vw * 1.75))",
              maxWidth: "400px",
              maxHeight: "700px",
            }}
          >
            <canvas
              ref={canvasRef}
              width={GAME_W}
              height={GAME_H}
              className="block h-full w-full rounded-[18px] border border-white/10 bg-black shadow-[0_0_40px_rgba(0,82,255,0.25)]"
              style={{
                touchAction: "none",
                WebkitUserSelect: "none",
                userSelect: "none",
              }}
            />

            <a
              {...mobileLink("/mobile?action=menu", goMainMenu)}
              className="absolute left-3 top-3 z-30 flex h-10 items-center px-3 rounded-2xl border border-white/15 bg-black/55 text-[10px] font-black tracking-[0.16em] text-white/70 backdrop-blur active:scale-95"
            >
              MENU
            </a>

            <div className="pointer-events-none absolute right-3 top-3 z-30 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-right backdrop-blur">
              <div className="text-[9px] font-black tracking-[0.18em] text-white/35">
                {getArenaLabel(arena)}
              </div>
              <div className="text-[10px] font-black tracking-[0.18em] text-[#0052FF]">
                {gameMode === "online" ? socketRegion : aiDifficulty.toUpperCase()}
              </div>
            </div>
          </div>
        </section>
      )}

      {showDifficulty && (
        <div className="absolute inset-0 z-[200] flex items-end justify-center bg-black/78 p-4 backdrop-blur">
          <div className="w-full max-w-[390px] rounded-[32px] border border-white/10 bg-[#050508] p-4 shadow-[0_0_45px_rgba(0,82,255,0.28)]">
            <p className="text-center text-[10px] font-black tracking-[0.35em] text-[#0052FF]">
              SELECT DIFFICULTY
            </p>

            {(["easy", "normal", "hard"] as const).map((level) => (
              <a
                key={level}
                {...mobileLink(`/mobile?action=start-ai&difficulty=${level}`, () => mobileStartAi(level))}
                className="mt-3 flex h-14 w-full items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-sm font-black tracking-[0.22em] text-white active:scale-95"
              >
                {level.toUpperCase()}
              </a>
            ))}

            <a
              {...mobileLink("/mobile?action=close-difficulty", () => setShowDifficulty(false))}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-[22px] text-xs font-black tracking-[0.22em] text-white/40 active:scale-95"
            >
              BACK
            </a>
          </div>
        </div>
      )}

      {showHowToPlay && (
        <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black/82 p-4 backdrop-blur">
          <div className="w-full max-w-[390px] rounded-[32px] border border-white/10 bg-[#050508] p-5 text-center shadow-[0_0_45px_rgba(0,82,255,0.28)]">
            <h2 className="text-2xl font-black tracking-[-0.04em]">HOW TO PLAY</h2>
            <p className="mt-4 text-sm leading-7 text-white/60">
              Draw short neon lines on your half. Bounce the ball into the rival goal.
              First to 7 wins. Energy refills while playing.
            </p>
            <a
              {...mobileLink("/mobile?action=close-howto", () => setShowHowToPlay(false))}
              className="mt-6 flex h-14 w-full items-center justify-center rounded-[24px] bg-[#0052FF] text-sm font-black tracking-[0.22em] text-white active:scale-95"
            >
              GOT IT
            </a>
          </div>
        </div>
      )}

      {matchFound && !showArenaVote && (
        <div className="absolute inset-0 z-[220] flex items-center justify-center bg-black/86 p-4 backdrop-blur">
          <div className="w-full max-w-[390px] rounded-[32px] border border-[#0052FF]/35 bg-[#030309] p-6 text-center shadow-[0_0_55px_rgba(0,82,255,0.35)]">
            <p className="text-[10px] font-black tracking-[0.35em] text-[#0052FF]">
              MATCH FOUND
            </p>
            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="truncate text-sm font-black tracking-[0.12em]">
                  {playerDisplayName}
                </div>
              </div>
              <div className="text-xl font-black text-[#0052FF]">VS</div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="truncate text-sm font-black tracking-[0.12em]">
                  {rivalDisplayName}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showArenaVote && (
        <div className="absolute inset-0 z-[230] flex items-end justify-center bg-black/84 p-4 backdrop-blur">
          <div className="w-full max-w-[420px] rounded-[32px] border border-white/10 bg-[#050508] p-4">
            <p className="text-center text-[10px] font-black tracking-[0.35em] text-[#0052FF]">
              VOTE ARENA
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {ARENA_OPTIONS.map((item) => {
                const myVote = isHostRef.current ? arenaVotes.host : arenaVotes.guest;
                const rivalVote = isHostRef.current ? arenaVotes.guest : arenaVotes.host;

                return (
                  <button
                    key={`mobile-vote-${item.key}`}
                    type="button"
                    {...mobileTap(() => {
                      if (!roomIdRef.current) return;
                      setVotedArena(item.key);
                      socketRef.current?.emit("vote-arena", {
                        roomCode: roomIdRef.current,
                        arena: item.key,
                      });
                    })}
                    className={`min-h-[92px] rounded-[22px] border p-3 text-left bg-gradient-to-br ${item.previewClass} active:scale-95 ${
                      votedArena === item.key || myVote === item.key
                        ? item.selectedClass
                        : "border-white/10 text-white/45"
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${item.dot}`} />
                    <div className="mt-2 text-xs font-black tracking-[0.15em]">
                      {item.title}
                    </div>
                    <div className="mt-1 text-[9px] font-black text-white/45">
                      {rivalVote === item.key ? "RIVAL VOTED" : item.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {countdown !== null && (
        <div className="pointer-events-none absolute inset-0 z-[240] flex items-center justify-center">
          <div className={`text-6xl font-black ${activeArenaTheme.countdownClass} ${activeArenaTheme.countdownGlowClass}`}>
            {countdown}
          </div>
        </div>
      )}

      {goalFlash && (
        <div className={`pointer-events-none absolute inset-0 z-[180] ${activeArenaTheme.flashClass}`} />
      )}

      {opponentLeft && (
        <div className="absolute inset-0 z-[250] flex items-center justify-center bg-black/85 p-4 backdrop-blur">
          <div className="w-full max-w-[380px] rounded-[32px] border border-white/10 bg-[#050508] p-6 text-center">
            <h2 className="text-2xl font-black">OPPONENT LEFT</h2>
            <button
              type="button"
              {...mobileTap(goMainMenu)}
              className="mt-6 h-14 w-full rounded-[24px] bg-[#0052FF] text-sm font-black tracking-[0.22em] active:scale-95"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}

      {winner && (
        <div className="absolute inset-0 z-[260] flex items-center justify-center bg-black/88 p-4 backdrop-blur">
          <div className="w-full max-w-[390px] rounded-[34px] border border-[#0052FF]/35 bg-[#030309] p-6 text-center shadow-[0_0_60px_rgba(0,82,255,0.35)]">
            <p className="text-[10px] font-black tracking-[0.35em] text-[#0052FF]">
              GAME OVER
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.06em]">
              {winner}
            </h2>
            <p className="mt-4 text-sm font-black tracking-[0.18em] text-white/55">
              {gameMode === "online" ? rivalDisplayName : "AI"} {finalScore?.ai ?? scoreRef.current.ai}
              {" ◇ "}
              {finalScore?.player ?? scoreRef.current.player} {gameMode === "online" ? playerDisplayName : "YOU"}
            </p>

            <button
              type="button"
              {...mobileTap(handlePlayAgain)}
              disabled={playAgainWaiting}
              className="mt-7 h-14 w-full rounded-[24px] bg-[#0052FF] text-sm font-black tracking-[0.22em] active:scale-95 disabled:opacity-50"
            >
              {playAgainWaiting ? "WAITING RIVAL" : "PLAY AGAIN"}
            </button>

            <button
              type="button"
              {...mobileTap(goMainMenu)}
              className="mt-3 h-12 w-full rounded-[22px] border border-white/15 text-xs font-black tracking-[0.22em] text-white/55 active:scale-95"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}
    </main>
  );
}