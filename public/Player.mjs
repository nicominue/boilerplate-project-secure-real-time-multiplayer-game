// public/js/Player.mjs
export default class Player {
  constructor(id, x = 0, y = 0, score = 0) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.score = score;
  }

  // direction: "up"|"down"|"left"|"right", amount: number pixels
  movePlayer(direction, amount) {
    if (typeof amount !== 'number') return;
    switch(direction) {
      case 'up': this.y -= amount; break;
      case 'down': this.y += amount; break;
      case 'left': this.x -= amount; break;
      case 'right': this.x += amount; break;
      default: break;
    }
    // optionally clamp values
    this.x = Math.max(0, Math.min(2000, this.x));
    this.y = Math.max(0, Math.min(2000, this.y));
  }

  // players: array of player objects {id, score, ...}
  calculateRank(allPlayers) {
    if (!Array.isArray(allPlayers)) return 'Rank: 1/1';
    // sort descending by score
    const sorted = allPlayers.slice().sort((a,b) => b.score - a.score);
    const total = sorted.length;
    const idx = sorted.findIndex(p => p.id === this.id);
    const rank = (idx >= 0) ? (idx + 1) : total;
    return `Rank: ${rank}/${total}`;
  }

  // collectibleItem: {id, x, y, value}
  collision(collectible) {
    if (!collectible) return false;
    const dx = Math.abs(this.x - collectible.x);
    const dy = Math.abs(this.y - collectible.y);
    const threshold = 20; // same threshold as server
    return dx <= threshold && dy <= threshold;
  }
}
