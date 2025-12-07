const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const port = 3000;
const app = express();
const server = http.createServer(app);

const GAME_TICK_RATE = 1000 / 30;

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const players = {};

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.get("/", (req, res) => {
  res.send("Hello World!");
  console.log("Hello");
});

setInterval(() => {
  io.emit("gameState", players);
}, GAME_TICK_RATE);

io.on("connection", (socket) => {
  console.log("a user connected " + socket.id);

  const randomX = Math.floor(Math.random() * 7) * 50;
  const randomY = Math.floor(Math.random() * 7) * 50;

  players[socket.id] = { id: socket.id, x: randomX, y: randomY, rotation: 0 };

  socket.emit("init", players);

  socket.on("playerMovement", (data) => {
    players[socket.id] = {
      ...players[socket.id],
      x: data.x,
      y: data.y,
      rotation: data.rotation,
    };
  });

  socket.on("shoot", (data) => {
    console.log("shoot", data);
    socket.broadcast.emit("shoot", {
      playerId: socket.id,
      bullet: data.bullet,
    });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
