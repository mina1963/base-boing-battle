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

const COUNTDOWN_DELAY_MS = 3500;
const BATTLE_HOLD_MS = 700;
const TICK_MS = 1000 / 60;
const STATE_EMIT_MS = 1000 / 60;

const rooms = new Map();
const socketRooms = new Map();

let waitingPlayers = [];

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

const ARENAS = ["classic", "base", "space", "temple"];

const normalizeArena = (arena) => (ARENAS.includes(arena) ? arena : null);

const randomArena = () => ARENAS[Math.floor(Math.random() * ARENAS.length)];

const createInitialState = () => ({
  ball: {
    x: 200,
    y: 350,
    vx: BALL_START_VX,
    vy: BALL_START_VY,
  },
  hostScore: 0,
  guestScore: 0,
  phase: "waiting",
  winner: null,
  roundStartAt: null,
  arena: "classic",
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
  arena: "classic",
  arenaVotes: {
    host: null,
    guest: null,
  },
  arenaVoteTimer: null,
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

const forceLeaveRoom = (socketId, roomCode) => {
  const s = io.sockets.sockets.get(socketId);
  if (s) {
    try {
      s.leave(roomCode);
    } catch (_) {}
  }
};

const startCountdown = (room) => {
  room.state.phase = "countdown";
  room.state.roundStartAt = Date.now() + COUNTDOWN_DELAY_MS;
  room.state.winner = null;
  room.state.arena = room.arena || "classic";
  room.lines = [];
  emitStateToRoom(room);
};

const resetRound = (room, direction = "down") => {
  room.state.phase = "countdown";
  room.state.roundStartAt = Date.now() + COUNTDOWN_DELAY_MS;
  room.state.winner = null;

  room.state.ball.x = GAME_W / 2;

  if (direction === "up") {
    room.state.ball.y = GAME_H - 175;
    room.state.ball.vx = BALL_RESET_VX;
    room.state.ball.vy = -BALL_RESET_VY;
  } else {
    room.state.ball.y = 175;
    room.state.ball.vx = -BALL_RESET_VX;
    room.state.ball.vy = BALL_RESET_VY;
  }

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

const applyLineCollision = (ball, line, lineDx, lineDy, dist) => {
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

const tickRoomPhysics = (room, dtScale = 1) => {
  if (room.state.phase === "countdown") {
    if (
      room.state.roundStartAt &&
      Date.now() >= room.state.roundStartAt + BATTLE_HOLD_MS
    ) {
      room.state.phase = "playing";
      room.state.roundStartAt = null;

      if (
        !room.state.ball.vx ||
        !room.state.ball.vy ||
        !Number.isFinite(room.state.ball.vx) ||
        !Number.isFinite(room.state.ball.vy)
      ) {
        room.state.ball.vx = BALL_START_VX * (Math.random() > 0.5 ? 1 : -1);
        room.state.ball.vy = BALL_START_VY;
      }

      emitStateToRoom(room);
    }

    return;
  }

  if (room.state.phase !== "playing" || room.state.winner) return;

  const ball = room.state.ball;

  const scaledVx = ball.vx * dtScale;
  const scaledVy = ball.vy * dtScale;
  const speedBeforeMove = Math.hypot(scaledVx, scaledVy);
  const steps = Math.max(1, Math.ceil(speedBeforeMove));
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

    let hitLine = null;

    for (const line of room.lines) {
      if (line.life < 4) continue;

      const { dist, lineDx, lineDy } = pointLineDistance(ball, line);

      if (dist < BALL_R + 14) {
        applyLineCollision(ball, line, lineDx, lineDy, dist);
        line.life = 0;
        hitLine = line;
        break;
      }
    }

    if (hitLine) break;
  }

  if (ball.y < 22) {
    room.state.hostScore += 1;

    if (room.state.hostScore >= 7) {
      finishGame(room, "host");
      return;
    }

    resetRound(room, "down");
    return;
  }

  if (ball.y > GAME_H - 8) {
    room.state.guestScore += 1;

    if (room.state.guestScore >= 7) {
      finishGame(room, "guest");
      return;
    }

    resetRound(room, "up");
    return;
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

  const wasHost = room.hostSocketId === socket.id;
  const wasGuest = room.guestSocketId === socket.id;

  if (!wasHost && !wasGuest) return;

  socket.to(roomCode).emit("opponent-left", {
    roomCode,
  });

  if (room.hostSocketId) {
    forceLeaveRoom(room.hostSocketId, roomCode);
    socketRooms.delete(room.hostSocketId);
  }

  if (room.guestSocketId) {
    forceLeaveRoom(room.guestSocketId, roomCode);
    socketRooms.delete(room.guestSocketId);
  }

  if (room.arenaVoteTimer) {
    clearTimeout(room.arenaVoteTimer);
    room.arenaVoteTimer = null;
  }

  rooms.delete(roomCode);
};

const detachSocketFromCurrentRoom = (socket, { notifyOpponent = true } = {}) => {
  const oldRoomCode = socketRooms.get(socket.id);

  waitingPlayers = waitingPlayers.filter((p) => p.socketId !== socket.id);

  if (!oldRoomCode) return;

  const oldRoom = rooms.get(oldRoomCode);
  socketRooms.delete(socket.id);

  try {
    socket.leave(oldRoomCode);
  } catch (_) {}

  if (!oldRoom) return;

  const wasHost = oldRoom.hostSocketId === socket.id;
  const wasGuest = oldRoom.guestSocketId === socket.id;

  if (!wasHost && !wasGuest) return;

  if (notifyOpponent) {
    socket.to(oldRoomCode).emit("opponent-left", { roomCode: oldRoomCode });
  }

  if (oldRoom.hostSocketId) {
    forceLeaveRoom(oldRoom.hostSocketId, oldRoomCode);
    socketRooms.delete(oldRoom.hostSocketId);
  }

  if (oldRoom.guestSocketId) {
    forceLeaveRoom(oldRoom.guestSocketId, oldRoomCode);
    socketRooms.delete(oldRoom.guestSocketId);
  }

  if (oldRoom.arenaVoteTimer) {
    clearTimeout(oldRoom.arenaVoteTimer);
    oldRoom.arenaVoteTimer = null;
  }

  rooms.delete(oldRoomCode);
};

const makeRoomCode = () => {
  let code = "";

  do {
    code = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
  } while (rooms.has(code));

  return code;
};

const getArenaVotesPayload = (room) => ({
  host: room.arenaVotes?.host || null,
  guest: room.arenaVotes?.guest || null,
});

const finishArenaVote = (room) => {
  if (!room || room.state.winner) return;

  if (
    room.state &&
    (room.state.phase === "countdown" || room.state.phase === "playing")
  ) {
    return;
  }

  if (!room.hostSocketId || !room.guestSocketId) return;

  const hostSocket = io.sockets.sockets.get(room.hostSocketId);
  const guestSocket = io.sockets.sockets.get(room.guestSocketId);

  if (!hostSocket || !guestSocket) return;

  if (room.arenaVoteTimer) {
    clearTimeout(room.arenaVoteTimer);
    room.arenaVoteTimer = null;
  }

  const votes = [room.arenaVotes.host, room.arenaVotes.guest].filter(Boolean);

  const selected =
    votes.length > 0
      ? votes[Math.floor(Math.random() * votes.length)]
      : randomArena();

  room.arena = selected;
  room.state.arena = selected;

  io.to(room.code).emit("arena-selected", {
    arena: selected,
    votes: getArenaVotesPayload(room),
  });

  startCountdown(room);

  const hostPayload = {
    roomCode: room.code,
    role: "host",
    arena: selected,
    opponentAddress: room.guestAddress,
    opponentUsername: room.guestUsername,
    state: withServerNow(room.state),
  };

  const guestPayload = {
    roomCode: room.code,
    role: "guest",
    arena: selected,
    opponentAddress: room.hostAddress,
    opponentUsername: room.hostUsername,
    state: withServerNow(room.state),
  };

  hostSocket.emit("room-matched", hostPayload);
  guestSocket.emit("room-matched", guestPayload);

  hostSocket.emit("match-start", hostPayload);
  guestSocket.emit("match-start", guestPayload);

  setTimeout(() => emitStateToRoom(room), 20);
  setTimeout(() => emitStateToRoom(room), 120);
  setTimeout(() => emitStateToRoom(room), 350);
};

const startArenaVote = (room) => {
  if (!room) return;
  if (!room.hostSocketId || !room.guestSocketId) return;

  const hostSocket = io.sockets.sockets.get(room.hostSocketId);
  const guestSocket = io.sockets.sockets.get(room.guestSocketId);
  if (!hostSocket || !guestSocket) return;

  if (room.arenaVoteTimer) {
    clearTimeout(room.arenaVoteTimer);
    room.arenaVoteTimer = null;
  }

  room.arenaVotes = { host: null, guest: null };
  room.lines = [];
  room.state = createInitialState();

  finishArenaVote(room);
};

const handleArenaVote = (room, socketId, arena) => {
  const selectedArena = normalizeArena(arena);
  if (!room || !selectedArena) return;

  if (socketId === room.hostSocketId) {
    room.arenaVotes.host = selectedArena;
  } else if (socketId === room.guestSocketId) {
    room.arenaVotes.guest = selectedArena;
  } else {
    return;
  }

  io.to(room.code).emit("arena-vote-update", {
    votes: getArenaVotesPayload(room),
  });

  if (room.arenaVotes.host && room.arenaVotes.guest) {
    finishArenaVote(room);
  }
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

  startArenaVote(room);
};

io.on("connection", (socket) => {
  console.log("CONNECTED:", socket.id);

  socket.on("create-room", ({ roomCode, address, username } = {}, ack) => {
    detachSocketFromCurrentRoom(socket, { notifyOpponent: true });

    let safeRoomCode = String(roomCode || makeRoomCode())
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);

    if (!safeRoomCode || rooms.has(safeRoomCode)) safeRoomCode = makeRoomCode();

    console.log("CREATE ROOM:", safeRoomCode);

    const room = createRoomObject({
      code: safeRoomCode,
      hostSocketId: socket.id,
      hostAddress: address,
      hostUsername: username,
    });

    rooms.set(safeRoomCode, room);
    socketRooms.set(socket.id, safeRoomCode);
    socket.join(safeRoomCode);

    const payload = {
      roomCode: safeRoomCode,
      role: "host",
      state: withServerNow(room.state),
    };

    socket.emit("room-created", payload);
    if (typeof ack === "function") ack(payload);
  });

  socket.on("join-room", ({ roomCode, address, username } = {}) => {
    const safeRoomCode = String(roomCode || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);

    console.log("JOIN ROOM:", safeRoomCode);

    detachSocketFromCurrentRoom(socket, { notifyOpponent: true });

    const room = rooms.get(safeRoomCode);

    if (!room) {
      socket.emit("join-error", "ROOM NOT FOUND");
      return;
    }

    const hostSocket = io.sockets.sockets.get(room.hostSocketId);
    if (!hostSocket) {
      rooms.delete(safeRoomCode);
      socket.emit("join-error", "ROOM EXPIRED");
      return;
    }

    if (room.hostSocketId === socket.id) {
      socket.emit("join-error", "ALREADY HOST");
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

    socketRooms.set(socket.id, safeRoomCode);
    socket.join(safeRoomCode);

    hostSocket?.emit("match-found", {
      roomCode: safeRoomCode,
      role: "host",
      opponentAddress: room.guestAddress,
      opponentUsername: room.guestUsername,
    });

    socket.emit("match-found", {
      roomCode: safeRoomCode,
      role: "guest",
      opponentAddress: room.hostAddress,
      opponentUsername: room.hostUsername,
    });

    startArenaVote(room);
  });

  socket.on("find-match", ({ address, username }) => {
    console.log("FIND MATCH:", socket.id);

    if (socketRooms.has(socket.id)) {
      detachSocketFromCurrentRoom(socket, { notifyOpponent: true });
    }

    waitingPlayers = waitingPlayers.filter((p) => p.socketId !== socket.id);

    waitingPlayers = waitingPlayers.filter((p) =>
      io.sockets.sockets.get(p.socketId)
    );

    const player = {
      socketId: socket.id,
      address,
      username: cleanUsername(username, "PLAYER"),
      joinedAt: Date.now(),
    };

    waitingPlayers.push(player);

    while (waitingPlayers.length >= 2) {
      const host = waitingPlayers.shift();
      const guest = waitingPlayers.shift();

      if (!host || !guest) break;

      const hostSocket = io.sockets.sockets.get(host.socketId);
      const guestSocket = io.sockets.sockets.get(guest.socketId);

      if (!hostSocket || !guestSocket) continue;
      if (host.socketId === guest.socketId) continue;

      createMatchedRoom({
        host: {
          ...host,
          username: cleanUsername(host.username, "PLAYER 1"),
        },
        guest: {
          ...guest,
          username: cleanUsername(guest.username, "PLAYER 2"),
        },
      });

      return;
    }

    socket.emit("matchmaking-status", {
      status: "searching",
    });
  });

  socket.on("vote-arena", ({ roomCode, arena }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    handleArenaVote(room, socket.id, arena);
  });

  socket.on("cancel-matchmaking", () => {
    waitingPlayers = waitingPlayers.filter((p) => p.socketId !== socket.id);

    socket.emit("matchmaking-status", {
      status: "cancelled",
    });
  });

  socket.on("host-state", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    emitStateToRoom(room);
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

    const BOTTOM_LINE_LIMIT = GAME_H - 45;

    const safeLine = {
      owner,
      x1: Math.max(0, Math.min(GAME_W, Number(line.x1))),
      y1: Math.max(0, Math.min(BOTTOM_LINE_LIMIT, Number(line.y1))),
      x2: Math.max(0, Math.min(GAME_W, Number(line.x2))),
      y2: Math.max(0, Math.min(BOTTOM_LINE_LIMIT, Number(line.y2))),
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
      room.arenaVotes = {
        host: null,
        guest: null,
      };

      io.to(roomCode).emit("play-again-status", {
        hostReadyAgain: false,
        guestReadyAgain: false,
      });

      startArenaVote(room);
    }
  });

  socket.on("leave-room", ({ roomCode, platform }) => {
    if (platform !== "mobile") return;

    const activeRoomCode = roomCode || socketRooms.get(socket.id);

    if (!activeRoomCode) return;

    cleanupRoomForSocket(socket);

    socket.emit("left-room", {
      roomCode: activeRoomCode,
    });
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECTED:", socket.id);

    waitingPlayers = waitingPlayers.filter((p) => p.socketId !== socket.id);

    cleanupRoomForSocket(socket);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`SOCKET SERVER RUNNING ON ${PORT}`);
});