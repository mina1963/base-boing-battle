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

export default function Home() {
  const [winner, setWinner] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const gameStartedRef = useRef(false);
  
const [goalFlash, setGoalFlash] = useState(false);

  const [countdown, setCountdown] = useState<number | string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const linesRef = useRef<Line[]>([]);
  const drawingRef = useRef<{ x: number; y: number } | null>(null);

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


  const trailRef = useRef<{ x: number; y: number }[]>([]);
const ballRef = useRef({
  x: 200,
  y: 350,
  r: 8,
  vx: 0.6,
  vy: 0.9,
  scored: false,
});

  const sparksRef = useRef<
  {
    x: number;
    y: number;
    life: number;
  }[]
>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
    // oyuncu tarafından başla
    ballRef.current.y = H - 140;
    ballRef.current.vx = 0.3;
    ballRef.current.vy = -0.9;
  } else {
    // AI tarafından başla
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
    life: 100,
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
// BASE NEON BACKGROUND
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

// subtle vertical grid
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

// BASE center ring
ctx.beginPath();
ctx.arc(W / 2, H / 2, 80, 0, Math.PI * 2);
ctx.strokeStyle = "rgba(0,82,255,0.22)";
ctx.lineWidth = 2;
ctx.shadowColor = "#0052FF";
ctx.shadowBlur = 12;
ctx.stroke();
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

      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`AI ${score.ai}  -  ${score.player} YOU`, W / 2, 52);

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

      if (score.messageLife > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 24px monospace";
        ctx.fillText(score.message, W / 2, H / 2 - 45);
        score.messageLife--;
      }

      const ball = ballRef.current;

if (
  frame % 40 === 0 &&
  ball.y < H / 2 - 20 &&
  ball.vy < 0
) {
  const aiY1 = Math.max(35, ball.y - 35);
  const aiY2 = Math.max(35, ball.y - 10);

  linesRef.current.push({
    x1: ball.x - 55,
    y1: Math.min(aiY1, H / 2 - 25),
    x2: ball.x + 55,
    y2: Math.min(aiY2, H / 2 - 25),
    life: 80,
    owner: "ai",
  });
}

      ball.x += ball.vx;
      ball.y += ball.vy;
      trailRef.current.push({ x: ball.x, y: ball.y });

if (trailRef.current.length > 12) {
  trailRef.current.shift();
}

      if (ball.x < 22 || ball.x > W - 22) ball.vx *= -1;

      if (ball.y < 22) {
        score.player++;

if (score.player >= 7) {
  score.message = "YOU WIN";
  setWinner("YOU WIN");
  setGameStarted(false);
        } else {
  score.message = "YOU SCORE";

  setGoalFlash(true);

  setTimeout(() => {
    setGoalFlash(false);
  }, 250);
}

        score.messageLife = 70;
        resetBall("down");
        startCountdown();
      }

      if (ball.y > H - 22) {
        score.ai++;

if (score.ai >= 7) {
  score.message = "AI WINS";
  setWinner("AI WINS");
  setGameStarted(false);

        } else {
          score.message = "AI SCORES";
          setGoalFlash(true);

setTimeout(() => {
  setGoalFlash(false);
}, 250);
        }

        score.messageLife = 70;
        resetBall("up");
        startCountdown();
      }

      const current = currentLineRef.current;

      if (current) {
        ctx.beginPath();
        ctx.moveTo(current.x1, current.y1);
        ctx.lineTo(current.x2, current.y2);
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(59,130,246,0.45)";
        ctx.shadowColor = "#3b82f6";
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      for (const line of linesRef.current) {
        if (line.life < 25) continue;

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

const speed = Math.min(
  currentSpeed + 0.02,
  3
);
          ball.vx = Math.cos(normal) * speed;
          ball.vy = Math.sin(normal) * speed;
          ball.vx += dx * 0.03;

          if (line.owner === "player" && ball.vy > 0) ball.vy *= -1;
          if (line.owner === "ai" && ball.vy < 0) ball.vy *= -1;


          sparksRef.current.push({
  x: ball.x,
  y: ball.y,
  life: 20,
});
          line.life = 0;
        }
      }

      linesRef.current = linesRef.current
        .map((l) => ({ ...l, life: l.life - 1 }))
        .filter((l) => l.life > 0);

      for (const line of linesRef.current) {
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
const alpha = Math.max(line.life / 100, 0.15);

ctx.strokeStyle =
  line.owner === "player"
    ? `rgba(59,130,246,${alpha})`
    : `rgba(239,68,68,${alpha})`;
        ctx.shadowColor = line.owner === "player" ? "#3b82f6" : "#ef4444";
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }


for (let i = 0; i < trailRef.current.length; i++) {
  const point = trailRef.current[i];
  const alpha = i / trailRef.current.length;

  ctx.beginPath();
  ctx.arc(point.x, point.y, ball.r * alpha, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${alpha * 0.35})`;
  ctx.fill();
}

sparksRef.current = sparksRef.current
  .map((s) => ({
    ...s,
    life: s.life - 1,
  }))
  .filter((s) => s.life > 0);

for (const spark of sparksRef.current) {
  const size = 30 - spark.life;
  const alpha = spark.life / 20;

  ctx.beginPath();
  ctx.arc(spark.x, spark.y, size, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

ctx.beginPath();
ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
ctx.fillStyle = "white";
ctx.shadowColor = "white";
ctx.shadowBlur = 18;
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

return (
  <main className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
    {!gameStarted && countdown === null && (
      <div className="absolute z-20 flex flex-col items-center text-center">
        <h1 className="text-white text-4xl font-black tracking-[0.25em]">
          {winner ?? "BOING BATTLE"}
        </h1>

        <p className="mt-4 text-white/45 text-xs tracking-[0.35em]">
          SWIPE • DEFLECT • SURVIVE
        </p>

        <button
          onClick={() => {
  scoreRef.current.player = 0;
  scoreRef.current.ai = 0;
  scoreRef.current.message = "";
  scoreRef.current.messageLife = 0;
  energyRef.current.value = 100;
  linesRef.current = [];
  trailRef.current = [];
  sparksRef.current = [];
  setWinner(null);

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
}}
          className="mt-10 px-8 py-4 rounded-full bg-blue-500 text-white font-bold tracking-[0.2em] hover:bg-blue-400 transition"
        >
          PLAY
        </button>
      </div>
    )}

  <canvas
  ref={canvasRef}
  width={400}
  height={700}
  className={`w-[100vw] h-[100dvh] max-w-[430px] max-h-[932px] rounded-none sm:rounded-3xl border border-white/15 touch-none transition ${
    gameStarted ? "opacity-100" : "opacity-0"
  }`}
/>
{goalFlash && (
  <div className="absolute inset-0 bg-[#0052FF]/20 pointer-events-none z-40" />
)}


{countdown !== null && (
  <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none">
    <div className="text-[#0052FF] text-sm font-black tracking-[0.5em] mb-3">
      BASE READY
    </div>

<div
  className={`font-black drop-shadow-[0_0_30px_rgba(0,82,255,0.9)] ${
    countdown === "BATTLE!"
      ? "text-[#0052FF] text-5xl"
      : "text-white text-7xl"
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
    <h1 className="text-4xl font-black text-white mb-2">
      {winner}
    </h1>

    <p className="mb-8 text-[#0052FF] text-xs font-black tracking-[0.35em]">
      BASE BATTLE COMPLETE
    </p>

    <button
      onClick={() => {
        scoreRef.current.player = 0;
        scoreRef.current.ai = 0;
        scoreRef.current.message = "";
        scoreRef.current.messageLife = 0;
        energyRef.current.value = 100;
        linesRef.current = [];
        trailRef.current = [];
        sparksRef.current = [];
        gameStartedRef.current = true;
        setWinner(null);
        setGameStarted(true);
      }}
      className="px-7 py-3 rounded-full bg-[#0052FF] hover:bg-blue-500 font-black text-white tracking-[0.2em] shadow-[0_0_30px_rgba(0,82,255,0.45)]"
    >
      PLAY AGAIN
    </button>
  </div>
)}
</main>
);
}