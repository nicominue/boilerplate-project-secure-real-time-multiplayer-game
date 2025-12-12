// server.js
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const helmet = require('helmet');
const bodyParser = require("body-parser");
const path = require('path');
const cors = require("cors")

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// app.use(helmet({
//   "X-Content-Type-Options": "noSniff",
//   "X-XSS-Protection": 0,
//   noCache : true,
// }));
// // app.use(helmet.noSniff());
// // app.use(helmet.xssFilter());    
// // app.use(helmet.noCache());
// // app.use(helmet.hidePoweredBy());      
// app.use((req, res, next) => {
//   res.setHeader('X-Powered-By', 'PHP 7.4.3');
//   next();
// });
app.use(
  helmet({

    noSniff: true,

    xssFilter: true,

    noCache: true,

    hidePoweredBy: {
      setTo: 'PHP 7.4.3'
    }
  })
);

app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({ origin: "*" }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// In-memory game state (simple)
const players = {};       // socketId -> player object
const collectibles = {};  // id -> collectible object
let nextCollectibleId = 1;

// Create a sample collectible on server start
function spawnCollectible(x = 100, y = 100, value = 1) {
  const id = String(nextCollectibleId++);
  const item = { id, x, y, value };
  collectibles[id] = item;
  io.emit('collectibleSpawned', item);
}
spawnCollectible(200,200,5);

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('player connected', socket.id);

  // client provides initial player info (username, color, etc.)
  socket.on('playerJoin', (playerInit) => {
    // create player object minimal: id, score, x, y
    const player = {
      id: socket.id,
      score: 0,
      x: playerInit.x || 50,
      y: playerInit.y || 50,
      ...(playerInit.meta || {})
    };
    players[socket.id] = player;

    // send current world to newly connected player
    socket.emit('worldState', { players: Object.values(players), collectibles: Object.values(collectibles) });

    // notify others
    socket.broadcast.emit('playerJoined', player);
  });

  socket.on('move', ({ direction, amount }) => {
    const p = players[socket.id];
    if (!p) return;
    // apply move with server-side validation
    if (['up','down','left','right'].includes(direction) && typeof amount === 'number') {
      // clamp amount to reasonable bounds, e.g. 0..100
      const moveAmount = Math.max(0, Math.min(100, amount));
      if (direction === 'up') p.y -= moveAmount;
      if (direction === 'down') p.y += moveAmount;
      if (direction === 'left') p.x -= moveAmount;
      if (direction === 'right') p.x += moveAmount;
      // optional: clamp positions to map bounds (e.g., 0..1000)
      p.x = Math.max(0, Math.min(2000, p.x));
      p.y = Math.max(0, Math.min(2000, p.y));

      // check collisions with collectibles
      for (let cid in collectibles) {
        const item = collectibles[cid];
        // simple AABB collision: treat players and items as points or small boxes
        const dx = Math.abs(p.x - item.x);
        const dy = Math.abs(p.y - item.y);
        const threshold = 20; // collision threshold in pixels
        if (dx <= threshold && dy <= threshold) {
          // collect
          p.score += item.value;
          delete collectibles[cid];
          io.emit('collected', { collectorId: p.id, collectibleId: cid, newScore: p.score });
          // optionally spawn a new one
          spawnCollectible(Math.floor(Math.random()*400), Math.floor(Math.random()*400), 1);
        }
      }

      // recalc ranks and broadcast minimal update
      const allPlayers = Object.values(players);
      // sort descending by score
      allPlayers.sort((a,b) => b.score - a.score);
      // compute ranks (1-based)
      const total = allPlayers.length;
      const ranks = {};
      for (let i = 0; i < allPlayers.length; i++) {
        ranks[allPlayers[i].id] = `Rank: ${i+1}/${total}`;
      }

      io.emit('playerMoved', { id: p.id, x: p.x, y: p.y, score: p.score, rank: ranks[p.id] });
    }
  });

  socket.on('disconnect', () => {
    console.log('player disconnected', socket.id);
    if (players[socket.id]) {
      delete players[socket.id];
      io.emit('playerLeft', { id: socket.id });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on ${PORT}`));
