const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

function createRoom() {
  return {
    players: [],
    board: Array(9).fill(""),
    turn: "X",
    gameOver: false,
    score: { X: 0, O: 0 },
    startingPlayer: "X"
  };
}

let rooms = {
  "Sala 1": createRoom(),
  "Sala 2": createRoom()
};

const combos = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function checkWinner(board) {
  for (let combo of combos) {
    const [a,b,c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo };
    }
  }
  if (!board.includes("")) return { winner: "draw" };
  return null;
}

function sendRooms() {
  const list = Object.keys(rooms).map(name => ({
    name,
    players: rooms[name].players.length
  }));
  io.emit("roomList", list);
}

io.on("connection", (socket) => {

  sendRooms();

  socket.on("joinRoom", ({ roomName, playerName }) => {

    for (let name in rooms) {
      let room = rooms[name];
      room.players = room.players.filter(p => p.id !== socket.id);

      if (room.players.length === 0) {
        rooms[name] = createRoom();
      }
    }

    const room = rooms[roomName];

    if (room.players.length >= 2) {
      socket.emit("errorMessage", "Sala cheia");
      return;
    }

    const symbol = room.players.length === 0 ? "X" : "O";

    room.players.push({
      id: socket.id,
      name: playerName,
      symbol
    });

    socket.join(roomName);

    sendRooms();

    if (room.players.length === 2) {
      io.to(roomName).emit("startGame", room);
    }
  });

  socket.on("makeMove", ({ roomName, index }) => {
    const room = rooms[roomName];
    if (!room || room.gameOver) return;

    if (room.board[index] !== "") return;

    room.board[index] = room.turn;

    const result = checkWinner(room.board);

    if (result) {
      room.gameOver = true;

      if (result.winner !== "draw") {
        room.score[result.winner]++;
      }

      io.to(roomName).emit("gameEnd", {
        result,
        room
      });

      setTimeout(() => {
        room.board = Array(9).fill("");

        room.startingPlayer =
          room.startingPlayer === "X" ? "O" : "X";

        room.turn = room.startingPlayer;
        room.gameOver = false;

        io.to(roomName).emit("resetGame", room);
      }, 2000);

      return;
    }

    room.turn = room.turn === "X" ? "O" : "X";

    io.to(roomName).emit("updateGame", room);
  });

  socket.on("disconnect", () => {
    for (let name in rooms) {
      let room = rooms[name];

      room.players = room.players.filter(p => p.id !== socket.id);

      if (room.players.length === 0) {
        rooms[name] = createRoom();
      }
    }

    sendRooms();
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});