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

export default function Home() {

  const socketRef = useRef<any>(null);
  const { address, isConnected } = useAccount();
const { openConnectModal } = useConnectModal();
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



  const GAME_W = 400;
  const GAME_H = 700;
  const BALL_START_VX = 0.42;
  const BALL_START_VY = 0.62;
  const BALL_RESET_VX = 0.25;
  const BALL_RESET_VY = 0.65;
  const MAX_BALL_SPEED = 2.5;

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

// FIX 1: startCountdown her zaman bir startAtMs alır.
// Her cihaz kendi Date.now()'ını timestamp ile karşılaştırır — 50ms polling.
// setCountdown sadece değer değişince çağrılır, gereksiz re-render engellenir.
const startCountdown = (startAtMs: number) => {
  clearCountdownTimers();

  countdownActiveRef.current = true;
  pauseRef.current = true;
  gameStartedRef.current = false;
  setGameStarted(false);

  let lastShown: number | string | null = null;

  const tick = () => {
    const remaining = startAtMs - Date.now();

    if (remaining > 2000) {
      if (lastShown !== 3) { lastShown = 3; setCountdown(3); }
      countdownDelayTimerRef.current = setTimeout(tick, 50);
    } else if (remaining > 1000) {
      if (lastShown !== 2) { lastShown = 2; setCountdown(2); }
      countdownDelayTimerRef.current = setTimeout(tick, 50);
    } else if (remaining > 0) {
      if (lastShown !== 1) { lastShown = 1; setCountdown(1); }
      countdownDelayTimerRef.current = setTimeout(tick, 50);
    } else {
      if (lastShown !== "BATTLE!") {
        lastShown = "BATTLE!";
        setCountdown("BATTLE!");
      }

      countdownBattleTimerRef.current = setTimeout(() => {
        setCountdown(null);
        countdownActiveRef.current = false;
        pauseRef.current = false;
        goalLockRef.current = false;
        gameStartedRef.current = true;
        setGameStarted(true);

        if (
          gameModeRef.current === "online" &&
          isHostRef.current &&
          roomIdRef.current
        ) {
          socketRef.current?.emit("host-state", {
            roomCode: roomIdRef.current,
            state: {
              phase: "playing",
              round_start_at: null,
              updated_at: Date.now(),
            },
          });
        }
      }, 700);
    }
  };

  tick();
};

  const applySocketState = (state: any) => {
    const hostScore = Number(state.host_score ?? state.hostScore ?? 0);
    const guestScore = Number(state.guest_score ?? state.guestScore ?? 0);

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

    if (!isHostRef.current) {
      targetBallRef.current.x = displayBallX;
      targetBallRef.current.y = displayBallY;
      targetBallRef.current.vx = displayBallVx;
      targetBallRef.current.vy = displayBallVy;
      targetBallUpdatedAtRef.current = Date.now();
    }

    if (state.phase === "countdown" || state.phase === "finished") {
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
      state.phase === "countdown" &&
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

        const startAtMs = typeof roundStartRaw === "number"
          ? roundStartRaw
          : new Date(roundStartRaw).getTime();

        // FIX 1: Her iki taraf da aynı timestamp ile countdown başlatır
        startCountdown(startAtMs);
      }
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
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
});
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
    applySocketState(state);
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
      // FIX 2: Remote çizgiler daha uzun yaşar — ağ gecikmesini telafi eder
      life: 65,
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
    socket.off("opponent-left");
    socket.off("opponent-disconnected");
    socket.disconnect();
  };
}, []);


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
      const p = getPos(e);
      if (p.y < H / 2) return;

      drawingRef.current = p;
    };

    const move = (e: PointerEvent) => {
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

      linesRef.current.push({
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        // FIX 2: Player çizgileri de daha uzun yaşar
        life: 65,
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

      if (energyRef.current.value < 100 && frame % 5 === 0) {
        energyRef.current.value += 1;
      }

      ctx.clearRect(0, 0, W, H);

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
      ctx.font = "900 46px monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "#0052FF";
      ctx.shadowBlur = 22;
      ctx.fillText("BASE", W / 2, H / 2 + 14);
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

      if (score.player === 6 && score.ai === 6) {
        ctx.fillStyle = "rgba(239,68,68,0.95)";
        ctx.font = "bold 28px monospace";
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 24;
        ctx.fillText("FINAL CLASH", W / 2, H / 2 - 95);
        ctx.shadowBlur = 0;
      } else if (score.player === 6 || score.ai === 6) {
        const matchPulse = 0.65 + Math.sin(frame * 0.08) * 0.35;

        ctx.fillStyle = `rgba(0,82,255,${matchPulse})`;
        ctx.font = "bold 24px monospace";
        ctx.shadowColor = "#0052FF";
        ctx.shadowBlur = 22;
        ctx.fillText("MATCH POINT", W / 2, H / 2 - 95);
        ctx.shadowBlur = 0;
      }

      if (score.messageLife > 0) {
        const messageAlpha = Math.min(1, score.messageLife / 18);
        const messageScale = 1 + Math.sin(score.messageLife * 0.18) * 0.035;

        ctx.save();
        ctx.translate(W / 2, H / 2 - 48);
        ctx.scale(messageScale, messageScale);
        ctx.fillStyle = `rgba(0,82,255,${messageAlpha})`;
        ctx.font = score.message.length > 15 ? "bold 26px monospace" : "bold 34px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = "#0052FF";
        ctx.shadowBlur = 28;
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
    life: 65,
    owner: "ai",
  });
}

if (roundActive) {
  if (
    gameModeRef.current === "online" &&
    !isHostRef.current
  ) {
const elapsedFrames = Math.min(
  4,
  (Date.now() - targetBallUpdatedAtRef.current) / 16.67
);

    const predictedX = Math.max(
      22,
      Math.min(W - 22, targetBallRef.current.x + targetBallRef.current.vx * elapsedFrames)
    );

    const predictedY = Math.max(
      22,
      Math.min(H - 22, targetBallRef.current.y + targetBallRef.current.vy * elapsedFrames)
    );

 const dx = predictedX - ball.x;
const dy = predictedY - ball.y;

const distance = Math.hypot(dx, dy);

if (distance < 0.9) {
  ball.x = predictedX;
  ball.y = predictedY;
} else if (distance > 90) {
  ball.x = predictedX;
  ball.y = predictedY;
} else {
 ball.x += dx * 0.24;
 ball.y += dy * 0.24;
}

    ball.vx = targetBallRef.current.vx;
    ball.vy = targetBallRef.current.vy;
  } else {
    ball.x += ball.vx;
    ball.y += ball.vy;
  }
}

if (
  gameModeRef.current === "online" &&
  isHostRef.current &&
  roomIdRef.current &&
  roundActive &&
  frame % 2 === 0
) {
  socketRef.current?.emit("host-state", {
    roomCode: roomIdRef.current,
    state: {
      ball_x: ball.x,
      ball_y: ball.y,
      ball_vx: ball.vx,
      ball_vy: ball.vy,
      host_score: scoreRef.current.player,
      guest_score: scoreRef.current.ai,
      winner:
        scoreRef.current.player >= 7
          ? "host"
          : scoreRef.current.ai >= 7
          ? "guest"
          : null,
      phase: "playing",
      round_start_at: null,
      updated_at: Date.now(),
    },
  });
}

      trailRef.current.push({ x: ball.x, y: ball.y });

      if (trailRef.current.length > 20) {
        trailRef.current.shift();
      }

if (roundActive && (ball.x < 22 || ball.x > W - 22)) {
  ball.vx *= -1;
  playSound("wall");
}

if (
  roundActive &&
  !(
    gameModeRef.current === "online" &&
    !isHostRef.current
  ) &&
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

  if (
    gameModeRef.current === "online" &&
    isHostRef.current &&
    roomIdRef.current
  ) {
    socketRef.current?.emit("host-state", {
      roomCode: roomIdRef.current,
      state: {
        winner: "host",
        host_score: score.player,
        guest_score: score.ai,
        phase: "finished",
        updated_at: Date.now(),
      },
    });
  }

  const winText =
    gameModeRef.current === "online"
      ? `${playerNameRef.current} WINS`
      : "YOU WIN";
  score.message = winText;
  winnerRef.current = winText;
  setWinner(winText);
  console.log("HOST WIN TRIGGERED");
} else {
  score.message =
    gameModeRef.current === "online"
      ? `${scoreAnnouncementName(playerNameRef.current)} SCORES`
      : "YOU SCORES";
  pauseRef.current = true;
  gameStartedRef.current = false;
  setGameStarted(false);
  setGoalFlash(true);
  setScreenShake(true);
  playSound("goal");

  setTimeout(() => setGoalFlash(false), 250);
  setTimeout(() => setScreenShake(false), 320);

  resetBall("down");

  if (
    gameModeRef.current === "online" &&
    isHostRef.current &&
    roomIdRef.current
  ) {
    // FIX 1: Host da roundStartAt ile startCountdown çağırır — setTimeout yok
    const roundStartAt = Date.now() + 3200;

    socketRef.current?.emit("host-state", {
      roomCode: roomIdRef.current,
      state: {
        ball_x: ballRef.current.x,
        ball_y: ballRef.current.y,
        ball_vx: ballRef.current.vx,
        ball_vy: ballRef.current.vy,
        host_score: score.player,
        guest_score: score.ai,
        winner: null,
        phase: "countdown",
        round_start_at: roundStartAt,
        updated_at: Date.now(),
      },
    });

    startCountdown(roundStartAt);
  } else {
    // AI modu — yerel countdown
    const roundStartAt = Date.now() + 1800;
    setTimeout(() => {
      pauseRef.current = false;
      startCountdown(roundStartAt);
    }, 0);
  }
}

        score.messageLife = 70;
      }
if (
  roundActive &&
  !(
    gameModeRef.current === "online" &&
    !isHostRef.current
  ) &&
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

  if (
    gameModeRef.current === "online" &&
    isHostRef.current &&
    roomIdRef.current
  ) {
    socketRef.current?.emit("host-state", {
      roomCode: roomIdRef.current,
      state: {
        winner: "guest",
        host_score: score.player,
        guest_score: score.ai,
        phase: "finished",
        updated_at: Date.now(),
      },
    });
  }

  const loseText =
    gameModeRef.current === "online"
      ? `${rivalNameRef.current} WINS`
      : "AI WINS";
  score.message = loseText;
  winnerRef.current = loseText;
  setWinner(loseText);
} else {
  const goalText =
    gameModeRef.current === "online"
      ? `${scoreAnnouncementName(rivalNameRef.current)} SCORES`
      : "AI SCORES";

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

  if (
    gameModeRef.current === "online" &&
    isHostRef.current &&
    roomIdRef.current
  ) {
    // FIX 1: Host da roundStartAt ile startCountdown çağırır — setTimeout yok
    const roundStartAt = Date.now() + 3200;

    socketRef.current?.emit("host-state", {
      roomCode: roomIdRef.current,
      state: {
        ball_x: ballRef.current.x,
        ball_y: ballRef.current.y,
        ball_vx: ballRef.current.vx,
        ball_vy: ballRef.current.vy,
        host_score: score.player,
        guest_score: score.ai,
        winner: null,
        phase: "countdown",
        round_start_at: roundStartAt,
        updated_at: Date.now(),
      },
    });

    startCountdown(roundStartAt);
  } else {
    // AI modu — yerel countdown
    const roundStartAt = Date.now() + 1800;
    setTimeout(() => {
      pauseRef.current = false;
      startCountdown(roundStartAt);
    }, 0);
  }
}

        score.messageLife = 70;
      }

      const shouldRunPhysics =
        gameModeRef.current !== "online" || isHostRef.current;

      if (shouldRunPhysics) {
        for (const line of linesRef.current) {
          // FIX 2: Daha erken life check — düşük life'ta collision kaçırılıyordu
          if (line.life < 4) continue;

          const dx = line.x2 - line.x1;
        const dy = line.y2 - line.y1;
        const lenSq = dx * dx + dy * dy;

        if (lenSq === 0) continue;

        const t = Math.max(
          0,
          Math.min(
            1,
            ((ball.x - line.x1) * dx + (ball.y - line.y1) * dy) / lenSq
          )
        );

        const px = line.x1 + t * dx;
        const py = line.y1 + t * dy;
        const dist = Math.hypot(ball.x - px, ball.y - py);

        // FIX 2: Daha geniş collision threshold — ağ gecikmesini telafi eder
        if (dist < ball.r + 7) {
const currentSpeed = Math.hypot(ball.vx, ball.vy);
const speed = Math.min(currentSpeed * 1.08 + 0.04, MAX_BALL_SPEED);

let nx = -dy;
let ny = dx;

const nLen = Math.hypot(nx, ny) || 1;
nx /= nLen;
ny /= nLen;

// Topun geliş yönüne göre normal yönünü düzelt
const dot = ball.vx * nx + ball.vy * ny;

if (dot > 0) {
  nx *= -1;
  ny *= -1;
}

ball.vx = nx * speed + dx * 0.006;
ball.vy = ny * speed + dy * 0.006;

          const nextSpeed = Math.hypot(ball.vx, ball.vy);
          if (nextSpeed > MAX_BALL_SPEED) {
            ball.vx = (ball.vx / nextSpeed) * MAX_BALL_SPEED;
            ball.vy = (ball.vy / nextSpeed) * MAX_BALL_SPEED;
          }

          // FIX 2: Top çizginin içine gömülmemesi için pozisyon düzelt
          const overlap = ball.r + 7 - dist;
          if (overlap > 0) {
            ball.x += nx * overlap;
            ball.y += ny * overlap;
          }

          for (let i = 0; i < 12; i++) {
            sparksRef.current.push({
              x: ball.x,
              y: ball.y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              life: 22,
              color: line.owner === "player" ? "#0052FF" : "#ef4444",
            });
          }

          navigator.vibrate?.(12);
          playSound("hit");
          line.life = 0;
          }
        }
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

        ctx.strokeStyle =
          line.owner === "player"
            ? `rgba(0,82,255,${alpha})`
            : `rgba(239,68,68,${alpha})`;

        ctx.shadowColor = line.owner === "player" ? "#0052FF" : "#ef4444";
        ctx.shadowBlur = 28;

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

        ctx.fillStyle = `rgba(0,82,255,${alpha * 0.28})`;
        ctx.shadowColor = "#0052FF";
        ctx.shadowBlur = 14;

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
      ctx.fillStyle = "rgba(0,82,255,0.18)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,82,255,0.65)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.shadowColor = "#0052FF";
      ctx.shadowBlur = 24;
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
      // FIX 1: AI modunda da timestamp bazlı countdown
      startCountdown(Date.now() + 3000);
      return;
    }

    if (
      gameModeRef.current === "online" &&
      isHostRef.current &&
      roomIdRef.current
    ) {
      const roundStartAt = Date.now() + 3200;

      socketRef.current?.emit("host-state", {
        roomCode: roomIdRef.current,
        state: {
          ball_x: ballRef.current.x,
          ball_y: ballRef.current.y,
          ball_vx: ballRef.current.vx,
          ball_vy: ballRef.current.vy,
          host_score: 0,
          guest_score: 0,
          winner: null,
          phase: "countdown",
          round_start_at: roundStartAt,
          updated_at: Date.now(),
        },
      });

      // FIX 1: Host da aynı timestamp ile başlar
      startCountdown(roundStartAt);
    }
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
  <div className="absolute inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center px-8">
    <div className="w-full max-w-sm text-center bg-[#050814] border border-[#0052FF]/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,82,255,0.15)]">
      <h2 className="text-white text-3xl font-black mb-2">
        SELECT AI
      </h2>

      <p className="text-[#0052FF] text-xs font-black tracking-[0.35em] mb-8">
        DIFFICULTY
      </p>

      {(["easy", "normal", "hard"] as const).map((level) => (
        <button
          key={level}
          onClick={() => {
            setAiDifficulty(level);
            aiDifficultyRef.current = level;
            setGameMode("ai");
            gameModeRef.current = "ai";
            setShowDifficulty(false);
            startGame();
          }}
          className="mt-3 w-full h-[54px] rounded-full border border-[#0052FF]/50 text-[#0052FF] font-black tracking-[0.2em] hover:bg-[#0052FF] hover:text-white transition"
        >
          {level.toUpperCase()}
        </button>
      ))}

      <button
        onClick={() => setShowDifficulty(false)}
        className="mt-8 text-white/35 text-xs font-black tracking-[0.25em]"
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

      <p className="text-[#0052FF] text-xs font-black tracking-[0.35em] mb-8">
        BASE MULTIPLAYER
      </p>

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
      SHARE THIS CODE WITH A FRIEND
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
          className="relative"
          style={{
            width: "min(100vw, calc(100dvh * 400 / 700), 430px)",
            aspectRatio: "400 / 700",
            maxHeight: "100dvh",
          }}
        >
          <canvas
            ref={canvasRef}
            width={400}
            height={700}
            className="block w-full h-full rounded-none sm:rounded-3xl border border-white/15 touch-none"
          />
        </div>
      </div>

      {goalFlash && (
        <div className="absolute inset-0 bg-[#0052FF]/25 pointer-events-none z-40" />
      )}

      {countdown !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none">
          <div className="text-[#0052FF] text-sm font-black tracking-[0.5em] mb-3">
            BASE READY
          </div>

<div
  key={countdown}
  className={`font-black animate-[countPop_0.7s_ease-out] drop-shadow-[0_0_35px_rgba(0,82,255,0.95)] ${
    countdown === "BATTLE!"
      ? "text-[#0052FF] text-6xl tracking-[0.15em]"
      : "text-white text-8xl"
  }`}
>
  {countdown}
</div>

          <div className="mt-4 text-white/35 text-[10px] tracking-[0.35em]">
            ONCHAIN ARCADE MODE
          </div>
        </div>
      )}


      {matchFound && (
        <div className="absolute inset-0 z-[1000] bg-black flex items-center justify-center overflow-hidden px-8 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,82,255,0.18),rgba(0,0,0,0)_52%)]" />

          <div className="absolute text-[170px] sm:text-[240px] font-black tracking-[0.18em] text-[#0052FF]/[0.08] select-none pointer-events-none blur-[1px]">
            BASE
          </div>

          <div className="absolute w-[540px] h-[540px] rounded-full border border-[#0052FF]/30 animate-[spin_30s_linear_infinite]" />
          <div className="absolute w-[380px] h-[380px] rounded-full border border-[#0052FF]/25" />
          <div className="absolute w-[220px] h-[220px] rounded-full border border-[#0052FF]/20 animate-pulse" />
          <div className="absolute w-[190px] h-[190px] rounded-full bg-[#0052FF]/20 blur-[120px] animate-pulse" />

          <div className="relative z-10 flex -translate-y-6 flex-col items-center animate-[matchPop_0.55s_ease-out]">
            <div className="text-[#0052FF] text-[10px] font-black tracking-[0.55em] mb-5 opacity-90">
              BASE MULTIPLAYER
            </div>

            <img
              src="/base.png"
              alt="Base"
              className="w-20 h-20 object-contain mb-7 drop-shadow-[0_0_42px_rgba(0,82,255,1)] animate-pulse"
            />

            <div className="-translate-y-4">
              <h1 className="text-white text-5xl sm:text-6xl font-black tracking-[0.2em] drop-shadow-[0_0_26px_rgba(0,82,255,0.65)]">
                MATCH
              </h1>

              <h1 className="mt-1 text-[#0052FF] text-6xl sm:text-7xl font-black tracking-[0.18em] drop-shadow-[0_0_38px_rgba(0,82,255,0.95)]">
                FOUND
              </h1>
            </div>

            <div className="mt-7 flex w-full max-w-[92vw] flex-col items-center justify-center">
              <div
                className="max-w-[92vw] break-words text-center text-white text-[clamp(28px,7vw,48px)] font-black leading-tight tracking-[0.08em] drop-shadow-[0_0_24px_rgba(255,255,255,.36)] animate-[slideLeft_.45s_ease-out]"
                title={playerDisplayName}
              >
                {playerDisplayName}
              </div>

              <div className="relative my-1 sm:my-2">
                <div className="absolute inset-0 rounded-full bg-[#0052FF]/40 blur-2xl" />

                <div className="relative text-[#0052FF] text-[42px] sm:text-[56px] font-black animate-pulse drop-shadow-[0_0_32px_rgba(0,82,255,.95)]">
                  ⚔
                </div>
              </div>

              <div
                className="max-w-[92vw] break-words text-center text-white text-[clamp(28px,7vw,48px)] font-black leading-tight tracking-[0.08em] drop-shadow-[0_0_24px_rgba(255,255,255,.36)] animate-[slideRight_.45s_ease-out]"
                title={rivalDisplayName}
              >
                {rivalDisplayName}
              </div>
            </div>

            <div className="mt-7 text-center">
              <div className="text-[#0052FF] text-[11px] font-black tracking-[0.45em] drop-shadow-[0_0_16px_rgba(0,82,255,.85)]">
                RANKED MATCH
              </div>

              <div className="mt-2 text-white/35 text-[10px] tracking-[0.35em]">
                FIRST TO 7
              </div>
            </div>

            <div className="mt-8 flex gap-2">
              <div className="w-2 h-2 rounded-full bg-[#0052FF] animate-bounce shadow-[0_0_12px_rgba(0,82,255,0.9)]" />
              <div
                className="w-2 h-2 rounded-full bg-[#0052FF] animate-bounce shadow-[0_0_12px_rgba(0,82,255,0.9)]"
                style={{ animationDelay: "0.15s" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-[#0052FF] animate-bounce shadow-[0_0_12px_rgba(0,82,255,0.9)]"
                style={{ animationDelay: "0.3s" }}
              />
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
