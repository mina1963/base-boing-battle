const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const GAME_W = 400;
const GAME_H = 700;

const rooms = new Map();
const socketRooms = new Map();

let waitingPlayer = null;

const cleanUsername = (username, fallback = "PLAYER") => {
  if (!username || typeof username !== "string") return fallback;

  return username
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 10) || fallback;
};

const createInitialState = () => ({
  ball: { x: 200, y: 350, vx: 0.42, vy: 0.62 },
  hostScore: 0,
  guestScore: 0,
  phase: "waiting",
  winner: null,
  roundStartAt: null,
});

const normalizeState = (currentState, incoming = {}) => {
  return {
    ...currentState,
    phase: incoming.phase ?? currentState.phase,
    winner:
      incoming.winner !== undefined
        ? incoming.winner
        : currentState.winner,
    roundStartAt:
      incoming.round_start_at ??
      incoming.roundStartAt ??
      currentState.roundStartAt,

    hostScore: Number(
      incoming.host_score ??
        incoming.hostScore ??
        currentState.hostScore
    ),
    guestScore: Number(
      incoming.guest_score ??
        incoming.guestScore ??
        currentState.guestScore
    ),

    ball: {
      x: Number(
        incoming.ball_x ?? incoming.ball?.x ?? currentState.ball.x
      ),
      y: Number(
        incoming.ball_y ?? incoming.ball?.y ?? currentState.ball.y
      ),
      vx: Number(
        incoming.ball_vx ?? incoming.ball?.vx ?? currentState.ball.vx
      ),
      vy: Number(
        incoming.ball_vy ?? incoming.ball?.vy ?? currentState.ball.vy
      ),
    },
  };
};

const resetRound = (room, direction = "down") => {
  const roundStartAt = Date.now() + 1200;

  room.state.phase = "countdown";
  room.state.roundStartAt = roundStartAt;
  room.state.winner = null;

  room.state.ball.x = GAME_W / 2;

  if (direction === "up") {
    room.state.ball.y = GAME_H - 175;
    room.state.ball.vx = 0.25;
    room.state.ball.vy = -0.65;
  } else {
    room.state.ball.y = 175;
    room.state.ball.vx = -0.25;
    room.state.ball.vy = 0.65;
  }

  io.to(room.code).emit("game-state", room.state);
};

const finishGame = (room, winner) => {
  room.state.phase = "finished";
  room.state.winner = winner;
  room.state.roundStartAt = null;

  io.to(room.code).emit("game-state", room.state);
};

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
    socketRooms.delete(room.hostSocketId);
  }

  if (room.guestSocketId) {
    socketRooms.delete(room.guestSocketId);
  }

  rooms.delete(roomCode);
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

const createMatchedRoom = ({ host, guest }) => {
  const roomCode = makeRoomCode();

  const room = {
    code: roomCode,
    hostSocketId: host.socketId,
    guestSocketId: guest.socketId,
    hostAddress: host.address,
    guestAddress: guest.address,
    hostUsername: cleanUsername(host.username, "PLAYER 1"),
    guestUsername: cleanUsername(guest.username, "PLAYER 2"),
    state: createInitialState(),
    hostReadyAgain: false,
    guestReadyAgain: false,
  };

  room.state.phase = "countdown";
  room.state.roundStartAt = Date.now() + 1800;
  room.state.winner = null;

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

  io.to(roomCode).emit("room-matched", {
    roomCode,
    state: room.state,
  });

  io.to(roomCode).emit("game-state", room.state);
};

io.on("connection", (socket) => {
  console.log("CONNECTED:", socket.id);

  socket.on("create-room", ({ roomCode, address, username }) => {
    console.log("CREATE ROOM:", roomCode);

    const room = {
      code: roomCode,
      hostSocketId: socket.id,
      guestSocketId: null,
      hostAddress: address,
      guestAddress: null,
      hostUsername: cleanUsername(username, "PLAYER 1"),
      guestUsername: null,
      state: createInitialState(),
      hostReadyAgain: false,
      guestReadyAgain: false,
    };

    rooms.set(roomCode, room);
    socketRooms.set(socket.id, roomCode);

    socket.join(roomCode);

    socket.emit("room-created", {
      roomCode,
      role: "host",
      state: room.state,
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

    socketRooms.set(socket.id, roomCode);

    socket.join(roomCode);

    room.state = createInitialState();
    room.state.phase = "countdown";
    room.state.roundStartAt = Date.now() + 1800;
    room.state.winner = null;

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

    io.to(roomCode).emit("room-matched", {
      roomCode,
      state: room.state,
    });

    io.to(roomCode).emit("game-state", room.state);
  });

  socket.on("find-match", ({ address, username }) => {
    console.log("FIND MATCH:", socket.id);

    if (socketRooms.has(socket.id)) {
      return;
    }

    if (
      waitingPlayer &&
      waitingPlayer.socketId === socket.id
    ) {
      socket.emit("matchmaking-status", {
        status: "searching",
      });
      return;
    }

    if (!waitingPlayer) {
      waitingPlayer = {
        socketId: socket.id,
        address,
        username: cleanUsername(username, "PLAYER 1"),
      };

      socket.emit("matchmaking-status", {
        status: "searching",
      });

      return;
    }

    const hostSocket = io.sockets.sockets.get(
      waitingPlayer.socketId
    );

    if (!hostSocket) {
      waitingPlayer = {
        socketId: socket.id,
        address,
        username: cleanUsername(username, "PLAYER 1"),
      };

      socket.emit("matchmaking-status", {
        status: "searching",
      });

      return;
    }

    const host = waitingPlayer;
    const guest = {
      socketId: socket.id,
      address,
      username: cleanUsername(username, "PLAYER 2"),
    };

    waitingPlayer = null;

    createMatchedRoom({
      host,
      guest,
    });
  });

  socket.on("cancel-matchmaking", () => {
    if (
      waitingPlayer &&
      waitingPlayer.socketId === socket.id
    ) {
      waitingPlayer = null;

      socket.emit("matchmaking-status", {
        status: "cancelled",
      });
    }
  });

  socket.on("host-state", ({ roomCode, state }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.hostSocketId !== socket.id) return;
    if (room.state.phase === "finished") return;

    room.state = normalizeState(room.state, state);

    if (room.state.hostScore >= 7) {
      finishGame(room, "host");
      return;
    }

    if (room.state.guestScore >= 7) {
      finishGame(room, "guest");
      return;
    }

    io.to(roomCode).emit("game-state", room.state);
  });

  socket.on("round-reset", ({ roomCode, direction, state }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.hostSocketId !== socket.id) return;

    if (state) {
      room.state = normalizeState(room.state, state);
    }

    if (room.state.hostScore >= 7) {
      finishGame(room, "host");
      return;
    }

    if (room.state.guestScore >= 7) {
      finishGame(room, "guest");
      return;
    }

    resetRound(room, direction);
  });

  socket.on("draw-line", ({ roomCode, line }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    socket.to(roomCode).emit("remote-line", line);
  });

  socket.on("play-again-ready", ({ roomCode, role }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    if (role === "host") room.hostReadyAgain = true;
    if (role === "guest") room.guestReadyAgain = true;

    io.to(roomCode).emit("play-again-status", {
      hostReadyAgain: room.hostReadyAgain,
      guestReadyAgain: room.guestReadyAgain,
    });

    if (room.hostReadyAgain && room.guestReadyAgain) {
      room.hostReadyAgain = false;
      room.guestReadyAgain = false;

      room.state = createInitialState();
      room.state.phase = "countdown";
      room.state.roundStartAt = Date.now() + 1800;
      room.state.winner = null;

      io.to(roomCode).emit("game-state", room.state);

      io.to(roomCode).emit("play-again-status", {
        hostReadyAgain: false,
        guestReadyAgain: false,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECTED:", socket.id);

    if (
      waitingPlayer &&
      waitingPlayer.socketId === socket.id
    ) {
      waitingPlayer = null;
    }

    cleanupRoomForSocket(socket);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`SOCKET SERVER RUNNING ON ${PORT}`);
});