const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// import { createClient } from 'redis';
// import mongoose from 'mongoose';
// await mongoose.connect('mongodb://127.0.0.1:27017/tanks');
// const client = createClient();

const port = 3000;
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const players = {};
const matches = {};
const playerRoomMap = {};
const MAX_PLAYERS_PER_MATCH = 2;
const GAME_TICK_RATE = 1000 / 30;
const MATCHMAKING_INTERVAL = 2000;
const matchmakingQueue = [];

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

function generateMatchId() {
  // Генерация простого уникального ID
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function removePlayerFromQueue(socketId) {
  const index = matchmakingQueue.indexOf(socketId);

  if (index !== -1) {
    matchmakingQueue.splice(index, 1);
  }
}

function checkMatchmakingQueue() {
  if (matchmakingQueue.length >= MAX_PLAYERS_PER_MATCH) {
    const player1Id = matchmakingQueue.shift();
    const player2Id = matchmakingQueue.shift();

    if (!player1Id || !player2Id) return;

    const newMatchId = generateMatchId();

    matches[newMatchId] = {
      id: newMatchId,
      players: {},
      status: "waiting",
    };

    [player1Id, player2Id].forEach((playerId) => {
      const playerSocket = io.sockets.sockets.get(playerId);
      if (playerSocket) {
        playerSocket.emit("matchFound", { matchId: newMatchId });
      } else {
        console.log(`Player ${playerId} not found after matchmaking.`);
      }
    });
  }
}

setInterval(checkMatchmakingQueue, MATCHMAKING_INTERVAL);

app.get("/", (req, res) => {
  res.send("Hello World!");
  console.log("Hello");
});

setInterval(() => {
  for (const roomId in matches) {
    const room = matches[roomId];

    if (room.status === "playing") {
      io.to(roomId).emit("gameState", room.players);
    }
  }
  // Убрали: io.emit("gameState", players) - players пустой и удалял спрайты
}, GAME_TICK_RATE);

io.on("connection", (socket) => {
  console.log("a user connected " + socket.id);
  let currentRoomId = null;


  socket.on("findMatch", () => {
    if (matchmakingQueue.includes(socket.id)) {
      socket.emit("matchStatus", { status: "already_queued" });
      return;
    }

    matchmakingQueue.push(socket.id);
    socket.emit("matchStatus", {
      status: "waiting",
      queueSize: matchmakingQueue.length,
    });

    console.log(
      `Player ${socket.id} joined queue. Size: ${matchmakingQueue.length}`
    );
  });

  socket.on("cancelMatchmaking", () => {
    removePlayerFromQueue(socket.id);
    socket.emit("matchStatus", { status: "cancelled" });
  });

  socket.on("joinMatch", (roomId) => {
    const isFreeRoom = Object.keys(matches[roomId].players).length >= MAX_PLAYERS_PER_MATCH;
    if (!matches[roomId]) {
      socket.emit("matchError", "Комната не найдена или заполнена.");
      return;
    }

    const room = matches[roomId];

    // Присоединение к комнате Socket.IO
    socket.join(roomId);
    currentRoomId = roomId;
    playerRoomMap[socket.id] = roomId;

    room.players[socket.id] = {
      id: socket.id,
      x: Math.floor(Math.random() * (7 - 2) + 2) * 50,
      y: Math.floor(Math.random() * (7 - 2) + 2) * 50,
      rotation: 0,
      baseHealth: 3
    };

    io.to(roomId).emit("init", room.players);
    console.log("Init players:", room.players);

    if (Object.keys(room.players).length === MAX_PLAYERS_PER_MATCH) {
      room.status = "playing";
      console.log("Матч начался!");
      io.to(roomId).emit("matchStart", "Матч начался!");
    }
  });

  socket.on("playerMovement", (data) => {
    if (
      !currentRoomId ||
      !matches[currentRoomId] ||
      matches[currentRoomId].status !== "playing"
    )
      return;

    const room = matches[currentRoomId];
    if (room.players[socket.id]) {
      room.players[socket.id] = {
        ...room.players[socket.id],
        x: data.x,
        y: data.y,
        rotation: data.rotation,
      };
    }
  });

  socket.on("shoot", (data) => {
    if (!currentRoomId || matches[currentRoomId].status !== "playing") return; // Отправляем выстрел ВСЕМ в комнате, кроме самого стрелка
    socket.to(currentRoomId).emit("shoot", {
      playerId: socket.id,
      bullet: data.bullet,
    });
  });

  socket.on("baseHit", (data) => {
    if (
      !currentRoomId ||
      !matches[currentRoomId] ||
      matches[currentRoomId].status !== "playing"
    ) return;

    // console.log('Base hit received from player:', matches[currentRoomId].players[data.playerId]);
    

    if(matches[currentRoomId].players[data.id].baseHealth > 1) {
      matches[currentRoomId].players[data.id].baseHealth -= 1;
      return;
    }  

    const victimId = data.id;
    const room = matches[currentRoomId];
    if (room.players[victimId]) {
      delete room.players[victimId];
      io.to(currentRoomId).emit("baseDestroyed", { id: victimId }); // Проверка на конец матча (остался один игрок)

      if (Object.keys(room.players).length === 1) {
        const winnerId = Object.keys(room.players)[0];
        room.status = "finished";
        io.to(currentRoomId).emit("matchEnd", { winnerId: winnerId });
      } else if (Object.keys(room.players).length === 0) {
        // Если оба покинули или был баг, удаляем комнату
        delete matches[currentRoomId];
      }
    }
      
  });

  socket.on("playerHit", (data) => {
    if (
      !currentRoomId ||
      !matches[currentRoomId] ||
      matches[currentRoomId].status !== "playing"
    )
      return;

    const victimId = data.id;
    const room = matches[currentRoomId];
    if (room.players[victimId]) {
      
      io.to(currentRoomId).emit("deathPlayer", { id: victimId }); // Проверка на конец матча (остался один игрок)

      // if (Object.keys(room.players).length === 1) {
      //   const winnerId = Object.keys(room.players)[0];
      //   room.status = "finished";
      //   io.to(currentRoomId).emit("matchEnd", { winnerId: winnerId });
      // } else if (Object.keys(room.players).length === 0) {
      //   // Если оба покинули или был баг, удаляем комнату
      //   delete matches[currentRoomId];
      // }
    }
  });

  socket.on("disconnect", () => {
    removePlayerFromQueue(socket.id);
    const roomId = playerRoomMap[socket.id];
    if (roomId && matches[roomId]) {
      // Удаляем игрока из комнаты
      delete matches[roomId].players[socket.id];
      delete playerRoomMap[socket.id];
      console.log(`Player ${socket.id} left room ${roomId}`); // Оповещаем остальных в комнате

      socket.to(roomId).emit("deathPlayer", { id: socket.id }); // Если комната пуста, или остался один (объявляем его победителем)
      const remainingPlayers = Object.keys(matches[roomId].players).length;
      if (matches[roomId].status === "playing" && remainingPlayers === 1) {
        const winnerId = Object.keys(matches[roomId].players)[0];
        matches[roomId].status = "finished";
        io.to(roomId).emit("matchEnd", {
          winnerId: winnerId,
          reason: "opponent_left",
        });
      } // Если комната пуста, удаляем ее
      if (remainingPlayers === 0) {
        delete matches[roomId];
        console.log(`Room ${roomId} deleted.`);
      }
    }
  });

  socket.on("clearMatchmaking", () => {
    matchmakingQueue = [];
  });
});


server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
