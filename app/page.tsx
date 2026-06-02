"use client";

import { useEffect, useRef, useState } from "react";

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
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [winner, setWinner] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showOnlineSoon, setShowOnlineSoon] = useState(false);

const [copied, setCopied] = useState(false);

const [roomCode, setRoomCode] = useState<string | null>(null);

const [showJoinRoom, setShowJoinRoom] =
  useState(false);

const pauseRef = useRef(false);

  const gameStartedRef = useRef(false);

  const [screenShake, setScreenShake] = useState(false);
  const [goalFlash, setGoalFlash] = useState(false);
  const [countdown, setCountdown] = useState<number | string | null>(null);

const [onlineStatus, setOnlineStatus] =
  useState<string | null>(null);


  const [showDifficulty, setShowDifficulty] = useState(false);
const [aiDifficulty, setAiDifficulty] =
  useState<"easy" | "normal" | "hard">("normal");



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
    vx: 0.6,
    vy: 0.9,
  });

  const startCountdown = () => {
    gameStartedRef.current = false;
    setGameStarted(false);
    setCountdown(3);

    let count = 3;

    const timer = setInterval(() => {
      count--;

      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(timer);
        setCountdown("BATTLE!");
        navigator.vibrate?.(30);

        setTimeout(() => {
          setCountdown(null);
          gameStartedRef.current = true;
          setGameStarted(true);
        }, 700);
      }
    }, 1000);
  };

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

      if (direction === "up") {
        ballRef.current.y = H - 140;
        ballRef.current.vx = 0.3;
        ballRef.current.vy = -0.9;
      } else {
        ballRef.current.y = 140;
        ballRef.current.vx = -0.3;
        ballRef.current.vy = 0.9;
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
      if (distance < 100) return;
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
        life: 35,
        owner: "player",
      });

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

      if (!gameStartedRef.current) {
        ctx.clearRect(0, 0, W, H);
        animation = requestAnimationFrame(loop);
        return;
      }

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

      const basePulse = 0.2 + Math.sin(frame * 0.01) * 0.02;
      ctx.fillStyle = `rgba(0,82,255,${basePulse})`;
      ctx.font = "bold 32px monospace";
      ctx.textAlign = "center";
      ctx.fillText("BASE", W / 2, H / 2 + 10);

      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, W - 24, H - 24);

      ctx.beginPath();
      ctx.moveTo(12, H / 2);
      ctx.lineTo(W - 12, H / 2);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.stroke();

      const score = scoreRef.current;

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`AI ${score.ai}   ◇   ${score.player} YOU`, W / 2, 50);

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
        ctx.fillStyle = "#0052FF";
        ctx.font = "bold 38px monospace";
        ctx.shadowColor = "#0052FF";
        ctx.shadowBlur = 25;
        ctx.fillText(score.message, W / 2, H / 2 - 45);
        ctx.shadowBlur = 0;
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
    life: 80,
    owner: "ai",
  });
}

if (!pauseRef.current) {
  ball.x += ball.vx;
  ball.y += ball.vy;
}

      trailRef.current.push({ x: ball.x, y: ball.y });

      if (trailRef.current.length > 20) {
        trailRef.current.shift();
      }

if (ball.x < 22 || ball.x > W - 22) {
  ball.vx *= -1;
  playSound("wall");
}

      if (ball.y < 22) {
        score.player++;

        if (score.player >= 7) {
          score.message = "YOU WIN";
          setWinner("YOU WIN");
          setGameStarted(false);
          gameStartedRef.current = false;
        } else {
          score.message = "YOU GOAL";
          pauseRef.current = true;
          setGoalFlash(true);
          setScreenShake(true);
          playSound("goal");

          setTimeout(() => setGoalFlash(false), 250);
          setTimeout(() => setScreenShake(false), 320);

resetBall("down");

setTimeout(() => {
  pauseRef.current = false;
  startCountdown();
}, 1800);
        }

        score.messageLife = 70;
      }

      if (ball.y > H - 22) {
        score.ai++;

        if (score.ai >= 7) {
          score.message = "AI WINS";
          setWinner("AI WINS");
          setGameStarted(false);
          gameStartedRef.current = false;
        } else {
          score.message = "AI GOAL";
          pauseRef.current = true;
          setGoalFlash(true);
          setScreenShake(true);
          playSound("goal");

          setTimeout(() => setGoalFlash(false), 250);
          setTimeout(() => setScreenShake(false), 320);

resetBall("down");

setTimeout(() => {
  pauseRef.current = false;
  startCountdown();
}, 1800);
        }

        score.messageLife = 70;
      }

      for (const line of linesRef.current) {
        if (line.life < 8) continue;

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

        if (dist < ball.r + 5) {
          const angle = Math.atan2(dy, dx);
          const normal = angle + Math.PI / 2;
          const currentSpeed = Math.hypot(ball.vx, ball.vy);
          const speed = Math.min(currentSpeed + 0.02, 3);

          ball.vx = Math.cos(normal) * speed;
          ball.vy = Math.sin(normal) * speed;
          ball.vx += dx * 0.03;

          if (line.owner === "player" && ball.vy > 0) ball.vy *= -1;
          if (line.owner === "ai" && ball.vy < 0) ball.vy *= -1;

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

      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("DRAW A LINE TO DEFLECT", W / 2, H - 20);

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

    linesRef.current = [];
    trailRef.current = [];
    sparksRef.current = [];

    setWinner(null);
    setCountdown(null);
    setScreen("game");

    startCountdown();
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
    setCountdown(null);
    setScreen("menu");
  };

  return (
    <main
      className={`w-screen h-screen bg-black flex items-center justify-center overflow-hidden ${
        screenShake ? "goal-shake" : ""
      }`}
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

      <button className="w-full h-[54px] rounded-full bg-[#0052FF] text-white font-black tracking-[0.18em]">
        CONNECT WALLET
      </button>

<button
onClick={() => {
  const code = Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase();

  setRoomCode(code);
  setShowJoinRoom(false);
  setOnlineStatus("WAITING FOR PLAYER...");
}}
  className="mt-4 w-full h-[54px] rounded-full border border-[#0052FF]/50 text-[#0052FF] font-black tracking-[0.18em]"
>
  CREATE ROOM
</button>

<button
  onClick={() => {
    setShowJoinRoom(true);
    setRoomCode(null);
    setOnlineStatus(null);
  }}
  className="mt-4 w-full h-[54px] rounded-full border border-white/15 text-white/70 font-black tracking-[0.18em]"
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
onClick={() => {
  setOnlineStatus("SEARCHING OPPONENT...");

  setTimeout(() => {
    setOnlineStatus("OPPONENT FOUND");
  }, 2000);
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
    setShowOnlineSoon(false);
    setRoomCode(null);
    setShowJoinRoom(false);
    setOnlineStatus(null);
  }}
  className="mt-8 text-white/35 text-xs font-black tracking-[0.25em]"
>
  BACK
</button>
    </div>
  </div>
)}

      <canvas
        ref={canvasRef}
        width={400}
        height={700}
        className={`w-[100vw] h-[100dvh] max-w-[430px] max-h-[932px] rounded-none sm:rounded-3xl border border-white/15 touch-none transition ${
          screen === "game" && gameStarted ? "opacity-100" : "opacity-0"
        }`}
      />

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

      {winner && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-50">
          <h1 className="text-4xl font-black text-white mb-2">{winner}</h1>

          <div className="mb-3 text-white/80 text-lg font-black tracking-[0.18em]">
            AI {scoreRef.current.ai} ◇ {scoreRef.current.player} YOU
          </div>

          <p className="mb-8 text-[#0052FF] text-xs font-black tracking-[0.35em]">
            FINAL SCORE
          </p>

          <div className="flex flex-col items-center">
            <button
              onClick={startGame}
              className="px-7 py-3 rounded-full bg-[#0052FF] hover:bg-blue-500 font-black text-white tracking-[0.2em] shadow-[0_0_30px_rgba(0,82,255,0.45)]"
            >
              PLAY AGAIN
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