import * as THREE from 'three';

// ========================
//   COLOR PALETTES
// ========================
const PALETTE = {
  glassBlue: '#5dade2',    // Terang, biru langit
  glassCyan: '#48c9b0',    // Terang, cyan reflektif
  cream: '#fdfefe',        // Sangat terang (hampir putih bersih)
  beige: '#f5eeb8',        // Krem hangat cerah
  grayLight: '#e5e7e9',    // Abu-abu sangat cerah
  gray: '#d5dbdb',         // Abu-abu terang bersih
  grayDark: '#888888',
  roofDark: '#555555',
  acBox: '#d3d3d3'
};

const MAIN_COLORS = [
  PALETTE.glassCyan, PALETTE.cream, PALETTE.beige, 
  PALETTE.grayLight, PALETTE.gray
];
const TREE_TRUNK = '#5e432c';
const TREE_LEAVES = ['#4caf50', '#5cb85c', '#388e3c'];

// ========================
//   HELPERS
// ========================
function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function darkenHex(hex, amount = 0.2) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, -amount);
  return '#' + c.getHexString();
}

// ========================
//   TEXTURE GENERATOR
// ========================
// Membuat fake window effect (grid kecil di dinding)
function createBuildingTexture(bodyHex, hasWindows = true, isGlassPanel = false) {
  const canvas = document.createElement('canvas');
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base color
  ctx.fillStyle = bodyHex;
  ctx.fillRect(0, 0, size, size);

  if (hasWindows) {
    const rows = 6;
    const cols = 6;
    const winW = size / cols * 0.6;
    const winH = size / rows * 0.7;
    const paddingX = (size / cols - winW) / 2;
    const paddingY = (size / rows - winH) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (size / cols) + paddingX;
        const y = r * (size / rows) + paddingY;
        
        // Jendela (bisa kaca biru terang atau kaca gelap)
        const isLit = Math.random() < 0.2; // Beberapa lampu menyala
        if (isGlassPanel) {
          ctx.fillStyle = isLit ? '#ffffff' : PALETTE.glassBlue;
        } else {
          ctx.fillStyle = isLit ? '#e0d8a6' : '#2a3b4c';
        }
        
        ctx.fillRect(x, y, winW, winH);
        
        // Highlight tipis di atas jendela
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(x, y, winW, winH * 0.15);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  return texture;
}

// ========================
//   ENVIRONMENT (Trees & Parks)
// ========================
function createTree(x, z) {
  const g = new THREE.Group();
  // Ukuran pohon kecil-sedang agar proporsional
  const th = rand(0.8, 1.3);
  const trunkGeo = new THREE.CylinderGeometry(0.05, 0.08, th, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: TREE_TRUNK, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = th / 2;
  trunk.castShadow = true;
  g.add(trunk);

  const lh = rand(0.7, 1.2);
  const leafGeo = Math.random() < 0.6 
    ? new THREE.ConeGeometry(rand(0.4, 0.6), lh, 6)
    : new THREE.DodecahedronGeometry(rand(0.4, 0.5), 0);
  const leafMat = new THREE.MeshStandardMaterial({ color: pick(TREE_LEAVES), roughness: 0.8 });
  const leaves = new THREE.Mesh(leafGeo, leafMat);
  leaves.position.y = th + (Math.random() < 0.5 ? lh / 2 : 0);
  leaves.castShadow = true;
  g.add(leaves);

  g.position.set(x, 0, z);
  return g;
}

function createStreetLamp(x, z) {
  const g = new THREE.Group();
  
  // Tiang
  const poleGeo = new THREE.CylinderGeometry(0.02, 0.03, 1.5, 5);
  const poleMat = new THREE.MeshStandardMaterial({ color: '#555555', roughness: 0.7, metalness: 0.6 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 0.75;
  pole.castShadow = true;
  g.add(pole);

  // Lengan lampu
  const armGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 4);
  const arm = new THREE.Mesh(armGeo, poleMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.15, 1.45, 0);
  g.add(arm);

  // Lampu
  const lampGeo = new THREE.BoxGeometry(0.1, 0.05, 0.1);
  const lampMat = new THREE.MeshStandardMaterial({ 
    color: '#ffffff', 
    emissive: '#fdfbc2', 
    emissiveIntensity: 0.5 
  });
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  lamp.position.set(0.3, 1.45, 0);
  g.add(lamp);

  g.position.set(x, 0, z);
  return g;
}

// --- CITY LIFE PROPS ---
function createCar(x, z, angle) {
  const g = new THREE.Group();
  const colors = ['#e74c3c', '#3498db', '#f1c40f', '#ecf0f1', '#34495e', '#2ecc71', '#9b59b6'];
  const carMat = new THREE.MeshStandardMaterial({ color: pick(colors), roughness: 0.3, metalness: 0.5 });
  
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.22), carMat);
  body.position.y = 0.1;
  body.castShadow = true;
  g.add(body);
  
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.2), new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.1 }));
  cabin.position.set(-0.05, 0.23, 0);
  cabin.castShadow = true;
  g.add(cabin);

  g.position.set(x, 0, z);
  g.rotation.y = angle;
  return g;
}

function createPedestrian(x, z) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: pick(['#e74c3c', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#bdc3c7']) });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.15), bodyMat);
  body.position.y = 0.075;
  body.castShadow = true;
  g.add(body);
  
  const headMat = new THREE.MeshStandardMaterial({ color: '#f1c27d' });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.025), headMat);
  head.position.y = 0.17;
  head.castShadow = true;
  g.add(head);

  g.position.set(x, 0.06, z); // 0.06 karena trotoar lebih tinggi
  g.rotation.y = rand(0, Math.PI * 2);
  return g;
}

function createTrafficLight(x, z, angle) {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: '#333' });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0), poleMat);
  pole.position.y = 0.5;
  pole.castShadow = true;
  g.add(pole);

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), poleMat);
  box.position.y = 1.0;
  box.castShadow = true;
  g.add(box);

  const colors = ['#e74c3c', '#f1c40f', '#2ecc71']; // Merah, Kuning, Hijau
  for(let i=0; i<3; i++) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: colors[i], emissive: colors[i], emissiveIntensity: 0.8 }));
    light.position.set(0.045, 1.08 - i*0.08, 0);
    g.add(light);
  }

  g.position.set(x, 0, z);
  g.rotation.y = angle;
  return g;
}

function createBench(x, z, angle) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#8b5a2b', roughness: 0.9 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.15), wood);
  seat.position.y = 0.1;
  seat.castShadow = true;
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.02), wood);
  back.position.set(0, 0.18, -0.065);
  back.castShadow = true;
  g.add(back);
  
  const legMat = new THREE.MeshStandardMaterial({ color: '#333', metalness: 0.8 });
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.12), legMat);
  leg1.position.set(-0.15, 0.05, 0);
  g.add(leg1);
  const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.12), legMat);
  leg2.position.set(0.15, 0.05, 0);
  g.add(leg2);

  g.position.set(x, 0.06, z); // di atas trotoar
  g.rotation.y = angle;
  return g;
}

function createTrashCan(x, z) {
  const mat = new THREE.MeshStandardMaterial({ color: '#7f8c8d', roughness: 0.7, metalness: 0.4 });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 8), mat);
  mesh.position.set(x, 0.12, z); // 0.06 + 0.06
  mesh.castShadow = true;
  return mesh;
}


function createPark(x, z, size) {
  const g = new THREE.Group();
  const grassMat = new THREE.MeshStandardMaterial({ color: '#68c958', roughness: 0.9 });
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.9, size * 0.9), grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = 0.02;
  grass.receiveShadow = true;
  g.add(grass);

  const numTrees = Math.floor(rand(2, 5));
  for (let i = 0; i < numTrees; i++) {
    const t = createTree(rand(-size*0.35, size*0.35), rand(-size*0.35, size*0.35));
    g.add(t);
  }
  g.position.set(x, 0, z);
  return g;
}

function createParkingLot(x, z, size) {
  const g = new THREE.Group();
  
  // Base aspal (sedikit lebih gelap dari trotoar)
  const baseMat = new THREE.MeshStandardMaterial({ color: '#3a3a3a', roughness: 0.9 });
  const base = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.95, size * 0.95), baseMat);
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.061; // Sedikit di atas trotoar (0.06)
  base.receiveShadow = true;
  g.add(base);

  // Marka parkir (garis putih) & Mobil
  const lineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  
  // 2 baris parkir saling berhadapan
  const numSpots = 4; // 4 mobil per baris = 8 slot
  const spotW = size * 0.8 / numSpots;
  const spotD = size * 0.35;
  
  for(let row = -1; row <= 1; row += 2) { 
    for (let i = 0; i < numSpots; i++) {
      const sx = (i - numSpots/2 + 0.5) * spotW;
      const sz = row * (spotD / 2 + 0.05);

      // Garis pembatas parkir
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.02, spotD), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(sx - spotW/2, 0.062, sz);
      g.add(line);

      // Peluang ada mobil di slot ini
      if (Math.random() < 0.6) {
        // Menghadap ke luar atau ke dalam
        const angle = row === 1 ? -Math.PI/2 : Math.PI/2; 
        const car = createCar(sx, sz, angle);
        car.position.y += 0.061; // naikkan karena di atas base parkiran
        g.add(car);
      }
    }
    // Garis ujung
    const lineEnd = new THREE.Mesh(new THREE.PlaneGeometry(0.02, spotD), lineMat);
    lineEnd.rotation.x = -Math.PI / 2;
    lineEnd.position.set((numSpots/2) * spotW, 0.062, row * (spotD / 2 + 0.05));
    g.add(lineEnd);
  }

  g.position.set(x, 0, z);
  return g;
}

// ========================
//   BUILDING CLASS
// ========================
export class Building {
  constructor(gx, gz, grid) {
    this.gx = gx;
    this.gz = gz;
    this.grid = grid;
    
    this.group = new THREE.Group();
    this.group.name = `Building_${gx}_${gz}`;
    
    // Set parameter dasar
    // Skala & Proporsi: Tinggi random 2 - 12 (Sesuai instruksi awal)
    const roll = Math.random();
    if (roll < 0.4) {
      this.targetHeight = rand(2, 4); // Kecil (rumah/toko)
    } else if (roll < 0.75) {
      this.targetHeight = rand(4, 8); // Sedang (kantor)
    } else {
      this.targetHeight = rand(8, 12); // Tinggi (apartemen/tower)
    }

    const cs = grid.cellSize;
    // Jarak antar bangunan rapi (cukup mepet untuk kesan padat)
    this.baseW = cs * rand(0.75, 0.95);
    this.baseD = cs * rand(0.75, 0.95);

    this._buildStructure();

    // Posisikan ke world
    const wp = grid.gridToWorld(gx, gz);
    this.group.position.set(wp.x, 0, wp.z);
    
    // Set obstacle ke grid
    grid.setCell(gx, gz, 1);
    grid.setBuildingHeight(gx, gz, this.targetHeight);
  }

  _buildStructure() {
    let currentY = 0;
    let curW = this.baseW;
    let curD = this.baseD;
    
    // Jumlah blok bertumpuk (1 sampai 4 lapis)
    const sections = Math.floor(rand(1, 4));
    
    // Warna fasad: setiap gedung memiliki variasi warna berbeda
    const colorBottom = pick(MAIN_COLORS);
    let colorTop = pick(MAIN_COLORS);
    if (Math.random() < 0.4) colorTop = PALETTE.glassBlue;

    for (let i = 0; i < sections; i++) {
      // Pembagian tinggi tiap lapis
      let sH = this.targetHeight / sections;
      if (sections > 1) sH *= rand(0.85, 1.15);

      // Variasi material (warna)
      const isTopSection = (i === sections - 1 && sections > 1);
      const isGlassPanel = isTopSection && colorTop === PALETTE.glassBlue;
      const sectionColor = isTopSection ? colorTop : colorBottom;
      
      const tex = createBuildingTexture(sectionColor, true, isGlassPanel);
      // Agar grid jendela proporsional
      tex.repeat.set(Math.max(1, Math.round(curW)), Math.max(1, Math.round(sH)));

      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: isGlassPanel ? 0.2 : 0.7,
        metalness: isGlassPanel ? 0.6 : 0.1,
      });

      const boxGeo = new THREE.BoxGeometry(curW, sH, curD);
      const box = new THREE.Mesh(boxGeo, mat);
      box.castShadow = true;
      box.receiveShadow = true;
      
      // Offset posisi sedikit agar tidak monoton (jika bukan blok pertama)
      let offsetX = 0, offsetZ = 0;
      if (i > 0) {
        offsetX = rand(-0.05, 0.05) * (this.baseW - curW);
        offsetZ = rand(-0.05, 0.05) * (this.baseD - curD);
      }
      
      box.position.set(offsetX, currentY + sH / 2, offsetZ);
      this.group.add(box);

      // Toko/Etalase di Lantai Dasar (Shop Storefront)
      if (i === 0 && sH > 1.5) {
        // Rangka toko
        const sfGeo = new THREE.BoxGeometry(curW * 1.01, 1.2, curD * 1.01);
        const sfMat = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.8 });
        const sf = new THREE.Mesh(sfGeo, sfMat);
        sf.position.set(offsetX, currentY + 0.6, offsetZ);
        this.group.add(sf);
        
        // Kaca Display (Etalase)
        const glassGeo = new THREE.BoxGeometry(curW * 1.02, 0.8, curD * 1.02);
        const glassMat = new THREE.MeshStandardMaterial({ color: '#cce6ff', roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.8 });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(offsetX, currentY + 0.5, offsetZ);
        this.group.add(glass);
        
        // Signage / Kanopi Sederhana di atas toko
        if (Math.random() < 0.8) {
          const signColors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#ffffff', '#e67e22'];
          const signGeo = new THREE.BoxGeometry(curW * 1.03, 0.2, curD * 1.03);
          const signMat = new THREE.MeshStandardMaterial({ color: pick(signColors), roughness: 0.4 });
          const sign = new THREE.Mesh(signGeo, signMat);
          sign.position.set(offsetX, currentY + 1.1, offsetZ);
          this.group.add(sign);
        }
      }

      // Balkon/List dekoratif di antara layer
      if (sections > 1 && i < sections - 1 && Math.random() < 0.6) {
        const balconyGeo = new THREE.BoxGeometry(curW * 1.05, 0.15, curD * 1.05);
        const balconyMat = new THREE.MeshStandardMaterial({ color: PALETTE.grayDark, roughness: 0.8 });
        const balcony = new THREE.Mesh(balconyGeo, balconyMat);
        balcony.position.set(offsetX, currentY + sH, offsetZ);
        balcony.castShadow = true;
        balcony.receiveShadow = true;
        this.group.add(balcony);
      }

      currentY += sH;
      
      // Lapisan berikutnya sedikit lebih kecil (stacking)
      curW *= rand(0.8, 0.95);
      curD *= rand(0.8, 0.95);
    }

    this._buildRooftop(currentY, curW, curD);
  }

  _buildRooftop(y, w, d) {
    // 1. Variasi Atap: Flat roof / Layered
    const hasLayeredRoof = Math.random() < 0.5;
    const roofMat = new THREE.MeshStandardMaterial({ color: PALETTE.roofDark, roughness: 0.9 });
    
    if (hasLayeredRoof) {
      const rw = w * 0.9;
      const rd = d * 0.9;
      const rh = 0.25;
      const roofL1 = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), roofMat);
      roofL1.position.y = y + rh / 2;
      roofL1.castShadow = true; roofL1.receiveShadow = true;
      this.group.add(roofL1);
      y += rh;
    }

    // 2. AC Box & Ventilasi
    if (Math.random() < 0.8) {
      const acCount = Math.floor(rand(1, 5));
      const acMat = new THREE.MeshStandardMaterial({ color: PALETTE.acBox, roughness: 0.7, metalness: 0.3 });
      for (let i = 0; i < acCount; i++) {
        const asizeX = rand(0.15, 0.35);
        const asizeY = rand(0.15, 0.25);
        const asizeZ = rand(0.15, 0.35);
        const ac = new THREE.Mesh(new THREE.BoxGeometry(asizeX, asizeY, asizeZ), acMat);
        ac.position.set(rand(-w*0.35, w*0.35), y + asizeY/2, rand(-d*0.35, d*0.35));
        ac.castShadow = true;
        this.group.add(ac);
      }
    }

    // 3. Tangki Air (Water Tank)
    if (Math.random() < 0.4) {
      const tw = rand(0.2, 0.35);
      const th = rand(0.3, 0.6);
      const tankMat = new THREE.MeshStandardMaterial({ color: '#cccccc', roughness: 0.6, metalness: 0.2 });
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(tw, tw, th, 8), tankMat);
      tank.position.set(rand(-w*0.3, w*0.3), y + th/2, rand(-d*0.3, d*0.3));
      tank.castShadow = true;
      this.group.add(tank);
    }

    // 4. Helipad (Hanya untuk gedung tinggi)
    if (this.targetHeight > 10 && Math.random() < 0.3 && w > 1.2 && d > 1.2) {
      const radius = Math.min(w, d) * 0.42;
      const padMat = new THREE.MeshStandardMaterial({ color: '#333333', roughness: 0.8 });
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.05, 16), padMat);
      pad.position.y = y + 0.05;
      pad.receiveShadow = true;
      this.group.add(pad);

      // Huruf H
      const hMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 });
      const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(radius*0.1, 0.02, radius*0.6), hMat);
      hBar1.position.set(-radius*0.2, y + 0.08, 0);
      this.group.add(hBar1);
      
      const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(radius*0.1, 0.02, radius*0.6), hMat);
      hBar2.position.set(radius*0.2, y + 0.08, 0);
      this.group.add(hBar2);
      
      const hCross = new THREE.Mesh(new THREE.BoxGeometry(radius*0.4, 0.02, radius*0.1), hMat);
      hCross.position.set(0, y + 0.08, 0);
      this.group.add(hCross);
    }

    // 5. Billboard / Papan Iklan Besar
    if (Math.random() < 0.35 && w > 0.8) {
      const bW = w * rand(0.6, 0.9);
      const bH = rand(0.6, 1.2);
      const isWall = Math.random() < 0.5; // Pasang di dinding atau di atap
      
      const boardColors = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#ffffff', '#1abc9c'];
      const boardColor = pick(boardColors);
      
      const boardGeo = new THREE.BoxGeometry(bW, bH, 0.1);
      const boardMat = new THREE.MeshStandardMaterial({ 
        color: boardColor, 
        emissive: boardColor, 
        emissiveIntensity: 0.3,
        roughness: 0.3 
      });
      const board = new THREE.Mesh(boardGeo, boardMat);
      
      if (isWall && y > bH * 1.5) {
        // Pasang di dinding samping bangunan
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { board.position.set(0, y - bH, d/2 + 0.05); }
        else if (side === 1) { board.position.set(0, y - bH, -d/2 - 0.05); board.rotation.y = Math.PI; }
        else if (side === 2) { board.position.set(w/2 + 0.05, y - bH, 0); board.rotation.y = Math.PI/2; }
        else { board.position.set(-w/2 - 0.05, y - bH, 0); board.rotation.y = -Math.PI/2; }
      } else {
        // Pasang di atas atap dengan tiang penyangga
        board.position.set(0, y + bH/2 + 0.15, 0);
        // Tiang
        const legMat = new THREE.MeshStandardMaterial({color: '#444'});
        const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), legMat);
        leg1.position.set(-bW * 0.3, y + 0.15, 0);
        this.group.add(leg1);
        const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), legMat);
        leg2.position.set(bW * 0.3, y + 0.15, 0);
        this.group.add(leg2);
      }
      this.group.add(board);
    }
  }

  addToScene(scene) {
    scene.add(this.group);
  }

  // ========================
  //   CITY GENERATOR (STATIC)
  // ========================
  static generateCity(grid, options = {}) {
    const { spawnChance = 0.70 } = options;
    const buildings = [];
    const extras = new THREE.Group();
    extras.name = 'CityExtras';
    const occupied = new Set();
    const parkCells = new Set();

    // Generate Parks (Ruang hijau)
    for (let gz = 2; gz < grid.rows - 2; gz += Math.floor(rand(3, 6))) {
      for (let gx = 2; gx < grid.cols - 2; gx += Math.floor(rand(3, 6))) {
        if (!grid.isRoad(gx, gz) && Math.random() < 0.25) {
          parkCells.add(`${gx}_${gz}`);
          const wp = grid.gridToWorld(gx, gz);
          extras.add(createPark(wp.x, wp.z, grid.cellSize));
          grid.setCell(gx, gz, 1);
          grid.setBuildingHeight(gx, gz, 0);
        }
      }
    }

    // Generate Buildings
    for (let gz = 0; gz < grid.rows; gz++) {
      for (let gx = 0; gx < grid.cols; gx++) {
        if (grid.isRoad(gx, gz)) continue;
        if (!grid.isWalkable(gx, gz)) continue;
        if (parkCells.has(`${gx}_${gz}`)) continue;
        if (Math.random() > spawnChance) {
          // Area kosong dijadikan parkiran
          const wp = grid.gridToWorld(gx, gz);
          extras.add(createParkingLot(wp.x, wp.z, grid.cellSize));
          grid.setCell(gx, gz, 1);
          grid.setBuildingHeight(gx, gz, 0);
          continue;
        }
        
        buildings.push(new Building(gx, gz, grid));
        occupied.add(`${gx}_${gz}`);
      }
    }

    // Add Roadside Trees, Lamps, City Life Elements
    for (let gz = 0; gz < grid.rows; gz++) {
      for (let gx = 0; gx < grid.cols; gx++) {
        
        const wp = grid.gridToWorld(gx, gz);

        // 1. KENDARAAN (Di atas jalan raya)
        if (grid.isRoad(gx, gz) && !grid.isIntersection(gx, gz)) {
          if (Math.random() < 0.15) {
            // Tentukan arah jalan
            const isHRoad = gz % grid.roadInterval === 0;
            // Posisi mobil sedikit di pinggir jalur (kiri/kanan)
            const laneOffset = (Math.random() < 0.5 ? 1 : -1) * (grid.cellSize * 0.2);
            let cx = wp.x, cz = wp.z;
            let angle = 0;
            if (isHRoad) {
              cz += laneOffset;
              angle = laneOffset > 0 ? Math.PI : 0;
            } else {
              cx += laneOffset;
              angle = laneOffset > 0 ? -Math.PI/2 : Math.PI/2;
            }
            // Geser sedikit maju mundur agar acak
            const driveOffset = rand(-0.3, 0.3) * grid.cellSize;
            if (isHRoad) cx += driveOffset; else cz += driveOffset;

            extras.add(createCar(cx, cz, angle));
          }
          continue; // Lanjut ke sel berikutnya, karena sel jalan tidak punya trotoar
        }

        // 2. TROTOAR (Pohon, Lampu, Pejalan Kaki, dll)
        // Hanya cek sel yang merupakan trotoar (sebelah jalan)
        if (!grid.isSidewalk(gx, gz)) continue;

        const neighbors = [[gx-1, gz], [gx+1, gz], [gx, gz-1], [gx, gz+1]];
        const isIntersectionAdjacent = neighbors.some(([nx, nz]) => grid.inBounds(nx, nz) && grid.isIntersection(nx, nz));

        for (const [nx, nz] of neighbors) {
          if (grid.inBounds(nx, nz) && grid.isRoad(nx, nz)) {
            // Jalan ada di arah ini
            const dirX = nx - gx;
            const dirZ = nz - gz;
            
            // Taruh tepat di tengah-tengah sisi sel agar konsisten dan rapi
            const edgeX = wp.x + dirX * (grid.cellSize * 0.45);
            const edgeZ = wp.z + dirZ * (grid.cellSize * 0.45);
            const finalX = edgeX;
            const finalZ = edgeZ;

            // Rotasi elemen agar menghadap jalan
            let facingAngle = 0;
            if (dirX === 1) facingAngle = Math.PI / 2;
            else if (dirX === -1) facingAngle = -Math.PI / 2;
            else if (dirZ === 1) facingAngle = 0;
            else if (dirZ === -1) facingAngle = Math.PI;

            // Jika dekat persimpangan, utamakan lampu lalu lintas
            if (isIntersectionAdjacent && Math.random() < 0.6) {
              // Geser sedikit ke pojok trotoar
              const cornerOffsetX = dirZ === 0 ? 0 : (Math.random() < 0.5 ? 0.3 : -0.3) * grid.cellSize;
              const cornerOffsetZ = dirX === 0 ? 0 : (Math.random() < 0.5 ? 0.3 : -0.3) * grid.cellSize;
              extras.add(createTrafficLight(finalX + cornerOffsetX, finalZ + cornerOffsetZ, facingAngle));
              continue; 
            }

            // Memastikan penempatan rapi (misal selang-seling)
            const isTreeSpot = (gx + gz) % 3 === 0;
            const isLampSpot = (gx + gz) % 4 === 1;
            const isBenchSpot = (gx + gz) % 5 === 2;

            // Pohon
            if (isTreeSpot && Math.random() < 0.7) {
              extras.add(createTree(finalX, finalZ));
            }
            // Lampu Jalan
            else if (isLampSpot && Math.random() < 0.8) {
              const lamp = createStreetLamp(finalX, finalZ);
              lamp.rotation.y = facingAngle;
              extras.add(lamp);
            }
            // Bangku Taman & Tempat Sampah
            else if (isBenchSpot && Math.random() < 0.6) {
              extras.add(createBench(finalX, finalZ, facingAngle));
              if (Math.random() < 0.5) {
                // Tempat sampah di sebelah bangku
                const tX = finalX + (dirZ === 0 ? 0 : 0.3);
                const tZ = finalZ + (dirX === 0 ? 0 : 0.3);
                extras.add(createTrashCan(tX, tZ));
              }
            }
            // Bollards atau Rambu
            else if (!isTreeSpot && !isLampSpot && !isBenchSpot && Math.random() < 0.5) {
              const isSign = Math.random() < 0.2;
              if (isSign) {
                // Rambu
                const bGeo = new THREE.BoxGeometry(0.04, 0.6, 0.04);
                const bMat = new THREE.MeshStandardMaterial({ color: '#888888', roughness: 0.8 });
                const mesh = new THREE.Mesh(bGeo, bMat);
                mesh.position.set(finalX, 0.3, finalZ);
                const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.02), new THREE.MeshStandardMaterial({ color: '#2b7bc4' }));
                signBoard.position.set(0, 0.3, 0);
                if (dirX !== 0) signBoard.rotation.y = Math.PI / 2;
                mesh.add(signBoard);
                mesh.castShadow = true;
                extras.add(mesh);
              } else {
                // Bollard
                const bGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8);
                const bMat = new THREE.MeshStandardMaterial({ color: '#d0d0d0', roughness: 0.6, metalness: 0.3 });
                const count = 3;
                for (let i = 0; i < count; i++) {
                  const mesh = new THREE.Mesh(bGeo, bMat);
                  const offset = (i / (count - 1) - 0.5) * (grid.cellSize * 0.7); 
                  const bx = finalX + (dirZ === 0 ? 0 : offset);
                  const bz = finalZ + (dirX === 0 ? 0 : offset);
                  mesh.position.set(bx, 0.1, bz);
                  mesh.castShadow = true;
                  extras.add(mesh);
                }
              }
            }

            // Pejalan Kaki (Pedestrians) di sekitar trotoar
            if (Math.random() < 0.3) {
              const pedX = wp.x + rand(-0.3, 0.3) * grid.cellSize;
              const pedZ = wp.z + rand(-0.3, 0.3) * grid.cellSize;
              extras.add(createPedestrian(pedX, pedZ));
            }
          }
        }
      }
    }

    Building._extras = extras;
    return buildings;
  }

  static addVegetationToScene(scene) {
    if (Building._extras) {
      scene.add(Building._extras);
    }
  }
}
