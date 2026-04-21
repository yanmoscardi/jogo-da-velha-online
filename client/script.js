const socket = io("http://localhost:3000"); // TROCAR DEPOIS

let board = document.getElementById("board");
let statusText = document.getElementById("status");
let roomsDiv = document.getElementById("rooms");

let cells = Array(9).fill("");
let currentPlayer = "X";
let mySymbol = null;
let currentRoom = null;
let currentPlayers = [];
let score = { X: 0, O: 0 };

function renderBoard() {
  board.innerHTML = "";

  cells.forEach((val, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";

    if (val) {
      cell.textContent = val;
      cell.classList.add(val.toLowerCase());
    }

    cell.onclick = () => handleMove(i);

    board.appendChild(cell);
  });
}

renderBoard();

socket.on("roomList", (rooms) => {
  roomsDiv.innerHTML = "";

  rooms.forEach(room => {
    const div = document.createElement("div");
    div.className = "room";
    div.textContent = `${room.name} (${room.players}/2)`;
    div.onclick = () => joinRoom(room.name);
    roomsDiv.appendChild(div);
  });
});

function joinRoom(roomName) {
  const name = document.getElementById("playerName").value || "Player";

  currentRoom = roomName;

  socket.emit("joinRoom", {
    roomName,
    playerName: name
  });
}

socket.on("startGame", (room) => {
  setupGame(room);
});

socket.on("updateGame", (room) => {
  updateBoard(room);
  updateStatus(room);
});

socket.on("gameEnd", ({ result, room }) => {
  updateBoard(room);
  score = room.score;

  if (result.winner !== "draw") {
    highlightWin(result.combo);
  }

  updateStatus(room, result);
});

socket.on("resetGame", (room) => {
  updateBoard(room);
  updateStatus(room);
});

function setupGame(room) {
  currentPlayers = room.players;

  const me = room.players.find(p => p.id === socket.id);
  mySymbol = me.symbol;

  score = room.score;

  updateBoard(room);
  updateStatus(room);
}

function updateStatus(room, result = null) {
  const p1 = currentPlayers[0];
  const p2 = currentPlayers[1];

  let text = "";

  text += `${p1.name} vs ${p2.name}<br>`;
  text += `Você é ${mySymbol}<br>`;
  text += `Placar X ${score.X} vs O ${score.O}<br>`;

  if (result) {
    if (result.winner === "draw") {
      text += "Empate!";
    } else {
      text += `Vitória do ${result.winner}`;
    }
  } else {
    if (room.turn === mySymbol) {
      text += "Sua vez";
    } else {
      text += "Vez do adversário";
    }
  }

  statusText.innerHTML = text;
}

function updateBoard(room) {
  cells = room.board;
  currentPlayer = room.turn;
  renderBoard();
}

function highlightWin(combo) {
  combo.forEach(i => {
    board.children[i].classList.add("win");
  });
}

function handleMove(i) {
  if (!currentRoom) return alert("Entre em uma sala");
  if (cells[i] !== "") return;
  if (currentPlayer !== mySymbol) return;

  socket.emit("makeMove", {
    roomName: currentRoom,
    index: i
  });
}