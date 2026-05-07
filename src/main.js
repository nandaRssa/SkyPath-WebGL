import { SceneManager } from './world/SceneManager.js';

// Inisialisasi dunia sesuai referensi
const world = new SceneManager({
  gridCols: 20,
  gridRows: 20,
  cellSize: 2,
  roadInterval: 4,
  spawnChance: 0.70,
});

// Pasang renderer ke halaman
world.mount(document.body);

// Animation loop
let lastTime = 0;
function animate(time) {
  requestAnimationFrame(animate);
  
  const delta = (time - lastTime) / 1000 || 0.016;
  lastTime = time;

  world.update(delta);
  world.render();
}

requestAnimationFrame(animate);
