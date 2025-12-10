// public/js/Collectible.mjs
export default class Collectible {
  constructor(id, x, y, value = 1) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.value = value;
  }
}

