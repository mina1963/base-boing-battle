const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

app.get("/", (_, res) => {
  res.send("Base Boing Battle socket server running");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const GAME_W = 400;
const GAME_H = 700;
const BALL_R = 8;

const BALL_START_VX = 1.2;
const BALL_START_VY = 1.8;
const BALL_RESET_VX = 1.2;
const BALL_RESET_VY = 1.8;
const MAX_BALL_SPEED = 10;

const ROUND_COUNTDOWN_DELAY_MS = 3500;
const INITIAL_COUNTDOWN_DELAY_MS = 6500;
const BATTLE_HOLD_MS = 700;
const TICK_MS = 1000 / 60;
const STATE_EMIT_MS = 1000 / 60;

const rooms = new Map();
const socketRooms = new Map();

let waitingPlayer = null;

const cleanUsername = (username, fallback = "PLAYER") => {
  if (!username || typeof username !== "string") return fallback;

  return (
    username
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 10) || fallback
  );
};

const createInitialState = () => ({
  ball: {
    x: GAME_W / 2,
    y: GAME_H / 2,
    vx: BALL_START_VX,
    vy: BALL_START_VY,
  },
  hostScore: 0,
  guestScore: 0,
  phase: "waiting",
  winner: null,
  roundStartAt: null,
});

const createRoomObject = ({
  code,
  hostSocketId,
  guestSocketId = null,
  hostAddress = null,
  guestAddress = null,
  hostUsername = "PLAYER 1",
  guestUsername = null,
}) => ({
  code,
  hostSocketId,
  guestSocketId,
  hostAddress,
  guestAddress,
  hostUsername: cleanUsername(hostUsername, "PLAYER 1"),
  guestUsername: guestUsername ? cleanUsername(guestUsername, "PLAYER 2") : null,
  state: createInitialState(),
  lines: [],
  hostReadyAgain: false,
  guestReadyAgain: false,
  lastTickAt: Date.now(),
  lastEmitAt: 0,
});

const withServerNow = (state) => ({
  ...state,
  serverNow: Date.now(),
});

const emitStateToRoom = (room) => {
  io.to(room.code).emit("game-state", withServerNow(room.state));
  room.lastEmitAt = Date.now();
};

const startCountdown = (room, delayMs = ROUND_COUNTDOWN_DELAY_MS) => {
  room.state.phase = "countdown";
  room.state.roundStartAt = Date.now() + delayMs;
  room.state.winner = null;
  room.lines = [];
  emitStateToRoom(room);
};

const resetRound = (room, direction = "down") => {
  room.state.phase = "countdown";
  room.state.roundStartAt = Date.now() + ROUND_COUNTDOWN_DELAY_MS;
  room.state.winner = null;

  const ball = room.state.ball;

  ball.x = GAME_W / 2;
  ball.y = GAME_H / 2;
  ball.vx = BALL_RESET_VX * (Math.random() > 0.5 ? 1 : -1);
  ball.vy = direction === "up" ? -BALL_RESET_VY : BALL_RESET_VY;

  room.lines = [];
  emitStateToRoom(room);
};

const finishGame = (room, winner) => {
  room.state.phase = "finished";
  room.state.winner = winner;
  room.state.roundStartAt = null;
  room.lines = [];
  emitStateToRoom(room);
};

const pointLineDistance = (ball, line) => {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return {
      dist: Math.hypot(ball.x - line.x1, ball.y - line.y1),
      lineDx: dx,
      lineDy: dy,
    };
  }

  const t = Math.max(
    0,
    Math.min(1, ((ball.x - line.x1) * dx + (ball.y - line.y1) * dy) / lenSq)
  );

  const px = line.x1 + t * dx;
  const py = line.y1 + t * dy;

  return {
    dist: Math.hypot(ball.x - px, ball.y - py),
    lineDx: dx,
    lineDy: dy,
  };
};

const applyLineCollision = (ball, lineDx, lineDy, dist) => {
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

  const overlap = BALL_R + 6 - dist;

  if (overlap > 0) {
    ball.x += nx * (overlap + 0.75);
    ball.y += ny * (overlap + 0.75);
  }
};

const handleGoal = (room, winnerSide) => {
  if (winnerSide === "host") {
    room.state.hostScore += 1;

    if (room.state.hostScore >= 7) {
      finishGame(room, "host");
      return;
    }

    resetRound(room, "down");
    return;
  }

  room.state.guestScore += 1;

  if (room.state.guestScore >= 7) {
    finishGame(room, "guest");
    return;
  }

  resetRound(room, "up");
};

const tickRoomPhysics = (room, dtScale = 1) => {
  if (room.state.phase === "countdown") {
    if (
      room.state.roundStartAt &&
      Date.now() >= room.state.roundStartAt + BATTLE_HOLD_MS
    ) {
      room.state.phase = "playing";
      room.state.roundStartAt = null;
      emitStateToRoom(room);
    }

    return;
  }

  if (room.state.phase !== "playing" || room.state.winner) return;

  const ball = room.state.ball;

  const scaledVx = ball.vx * dtScale;
  const scaledVy = ball.vy * dtScale;
  const speedBeforeMove = Math.hypot(scaledVx, scaledVy);
  const steps = Math.max(1, Math.ceil(speedBeforeMove / 2));
  const stepVx = scaledVx / steps;
  const stepVy = scaledVy / steps;

  for (let step = 0; step < steps; step++) {
    ball.x += stepVx;
    ball.y += stepVy;

    if (ball.x < 22) {
      ball.x = 22;
      ball.vx = Math.abs(ball.vx);
    }

    if (ball.x > GAME_W - 22) {
      ball.x = GAME_W - 22;
      ball.vx = -Math.abs(ball.vx);
    }

    if (ball.y < 22) {
      handleGoal(room, "host");
      return;
    }

    if (ball.y > GAME_H - 22) {
      handleGoal(room, "guest");
      return;
    }

    let hitLine = null;

    for (const line of room.lines) {
      if (line.life < 4) continue;

      const { dist, lineDx, lineDy } = pointLineDistance(ball, line);

      if (dist < BALL_R + 6) {
        applyLineCollision(ball, lineDx, lineDy, dist);
        line.life = 0;
        hitLine = line;
        break;
      }
    }

    if (hitLine) break;
  }

  room.lines = room.lines
    .map((line) => ({
      ...line,
      life: line.life - 1,
    }))
    .filter((line) => line.life > 0);

  if (Date.now() - room.lastEmitAt >= STATE_EMIT_MS) {
    emitStateToRoom(room);
  }
};

setInterval(() => {
  const now = Date.now();

  for (const room of rooms.values()) {
    const dt = Math.min(50, now - (room.lastTickAt || now));
    room.lastTickAt = now;

    tickRoomPhysics(room, dt / 16.67);
  }
}, TICK_MS);

const cleanupRoomForSocket = (socket) => {
  const roomCode = socketRooms.get(socket.id);
  if (!roomCode) return;

  socketRooms.delete(socket.id);

  const room = rooms.get(roomCode);
  if (!room) return;

  socket.to(roomCode).emit("opponent-left", { roomCode });

  if (room.hostSocketId) socketRooms.delete(room.hostSocketId);
  if (room.guestSocketId) socketRooms.delete(room.guestSocketId);

  rooms.delete(roomCode);
};

const makeRoomCode = () => {
  let code = "";

  do {
    code = Math.random().toString(36).substring(2, 6).toUpperCase();
  } while (rooms.has(code));

  return code;
};

const createMatchedRoom = ({ host, guest }) => {
  const roomCode = makeRoomCode();

  const room = createRoomObject({
    code: roomCode,
    hostSocketId: host.socketId,
    guestSocketId: guest.socketId,
    hostAddress: host.address,
    guestAddress: guest.address,
    hostUsername: host.username,
    guestUsername: guest.username,
  });

  rooms.set(roomCode, room);
  socketRooms.set(host.socketId, roomCode);
  socketRooms.set(guest.socketId, roomCode);

  const hostSocket = io.sockets.sockets.get(host.socketId);
  const guestSocket = io.sockets.sockets.get(guest.socketId);

  hostSocket?.join(roomCode);
  guestSocket?.join(roomCode);

  hostSocket?.emit("match-found", {
    roomCode,
    role: "host",
    opponentAddress: guest.address,
    opponentUsername: room.guestUsername,
  });

  guestSocket?.emit("match-found", {
    roomCode,
    role: "guest",
    opponentAddress: host.address,
    opponentUsername: room.hostUsername,
  });

  startCountdown(room, INITIAL_COUNTDOWN_DELAY_MS);

  io.to(roomCode).emit("room-matched", {
    roomCode,
    state: withServerNow(room.state),
  });
};

io.on("connection", (socket) => {
  console.log("CONNECTED:", socket.id);

  socket.on("create-room", ({ roomCode, address, username }) => {
    console.log("CREATE ROOM:", roomCode);

    const room = createRoomObject({
      code: roomCode,
      hostSocketId: socket.id,
      hostAddress: address,
      hostUsername: username,
    });

    rooms.set(roomCode, room);
    socketRooms.set(socket.id, roomCode);
    socket.join(roomCode);

    socket.emit("room-created", {
      roomCode,
      role: "host",
      state: withServerNow(room.state),
    });
  });

  socket.on("join-room", ({ roomCode, address, username }) => {
    console.log("JOIN ROOM:", roomCode);

    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit("join-error", "ROOM NOT FOUND");
      return;
    }

    if (room.guestSocketId) {
      socket.emit("join-error", "ROOM FULL");
      return;
    }

    room.guestSocketId = socket.id;
    room.guestAddress = address;
    room.guestUsername = cleanUsername(username, "PLAYER 2");
    room.state = createInitialState();
    room.hostReadyAgain = false;
    room.guestReadyAgain = false;
    room.lines = [];

    socketRooms.set(socket.id, roomCode);
    socket.join(roomCode);

    const hostSocket = io.sockets.sockets.get(room.hostSocketId);

    hostSocket?.emit("match-found", {
      roomCode,
      role: "host",
      opponentAddress: room.guestAddress,
      opponentUsername: room.guestUsername,
    });

    socket.emit("match-found", {
      roomCode,
      role: "guest",
      opponentAddress: room.hostAddress,
      opponentUsername: room.hostUsername,
    });

    startCountdown(room, INITIAL_COUNTDOWN_DELAY_MS);

    io.to(roomCode).emit("room-matched", {
      roomCode,
      state: withServerNow(room.state),
    });
  });

  socket.on("find-match", ({ address, username }) => {
    console.log("FIND MATCH:", socket.id);

    if (socketRooms.has(socket.id)) return;

    if (waitingPlayer && waitingPlayer.socketId === socket.id) {
      socket.emit("matchmaking-status", { status: "searching" });
      return;
    }

    if (!waitingPlayer) {
      waitingPlayer = {
        socketId: socket.id,
        address,
        username: cleanUsername(username, "PLAYER 1"),
      };

      socket.emit("matchmaking-status", { status: "searching" });
      return;
    }

    const hostSocket = io.sockets.sockets.get(waitingPlayer.socketId);

    if (!hostSocket) {
      waitingPlayer = {
        socketId: socket.id,
        address,
        username: cleanUsername(username, "PLAYER 1"),
      };

      socket.emit("matchmaking-status", { status: "searching" });
      return;
    }

    const host = waitingPlayer;

    const guest = {
      socketId: socket.id,
      address,
      username: cleanUsername(username, "PLAYER 2"),
    };

    waitingPlayer = null;

    createMatchedRoom({ host, guest });
  });

  socket.on("cancel-matchmaking", () => {
    if (waitingPlayer && waitingPlayer.socketId === socket.id) {
      waitingPlayer = null;
      socket.emit("matchmaking-status", { status: "cancelled" });
    }
  });

  socket.on("round-reset", ({ roomCode, direction }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.hostSocketId !== socket.id) return;

    resetRound(room, direction || "down");
  });

  socket.on("draw-line", ({ roomCode, line }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const owner =
      socket.id === room.hostSocketId
        ? "host"
        : socket.id === room.guestSocketId
        ? "guest"
        : null;

    if (!owner) return;
    if (room.state.phase !== "playing") return;

    const safeLine = {
      owner,
      x1: Math.max(0, Math.min(GAME_W, Number(line.x1))),
      y1: Math.max(0, Math.min(GAME_H, Number(line.y1))),
      x2: Math.max(0, Math.min(GAME_W, Number(line.x2))),
      y2: Math.max(0, Math.min(GAME_H, Number(line.y2))),
      life: 45,
    };

    const ownerLines = room.lines.filter((l) => l.owner === owner);

    if (ownerLines.length >= 2) {
      const firstIndex = room.lines.findIndex((l) => l.owner === owner);
      if (firstIndex !== -1) room.lines.splice(firstIndex, 1);
    }

    room.lines.push(safeLine);
    socket.to(roomCode).emit("remote-line", safeLine);
  });

  socket.on("play-again-ready", ({ roomCode, role }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    if (role === "host" && socket.id === room.hostSocketId) {
      room.hostReadyAgain = true;
    }

    if (role === "guest" && socket.id === room.guestSocketId) {
      room.guestReadyAgain = true;
    }

    io.to(roomCode).emit("play-again-status", {
      hostReadyAgain: room.hostReadyAgain,
      guestReadyAgain: room.guestReadyAgain,
    });

    if (room.hostReadyAgain && room.guestReadyAgain) {
      room.hostReadyAgain = false;
      room.guestReadyAgain = false;

      room.state = createInitialState();
      room.lines = [];
      startCountdown(room);

      io.to(roomCode).emit("play-again-status", {
        hostReadyAgain: false,
        guestReadyAgain: false,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECTED:", socket.id);

    if (waitingPlayer && waitingPlayer.socketId === socket.id) {
      waitingPlayer = null;
    }

    cleanupRoomForSocket(socket);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`SOCKET SERVER RUNNING ON ${PORT}`);
});