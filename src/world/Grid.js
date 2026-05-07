import * as THREE from 'three';

/**
 * Grid.js — Grid kota modern Dubai-style
 * Jalan lebar & rapi, grid lines sangat tipis & transparan
 * Rumput hijau cerah (#82E0AA)
 */
export class Grid {
  constructor(cols = 20, rows = 20, cellSize = 2, roadInterval = 4) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.roadInterval = roadInterval;

    this.offsetX = -(this.cols * this.cellSize) / 2;
    this.offsetZ = -(this.rows * this.cellSize) / 2;

    this.mainRoadX = Math.floor(cols / 2);
    this.mainRoadZ = Math.floor(rows / 2);
    this.mainRoadX = Math.round(this.mainRoadX / roadInterval) * roadInterval;
    this.mainRoadZ = Math.round(this.mainRoadZ / roadInterval) * roadInterval;

    this.cells = [];
    for (let gz = 0; gz < this.rows; gz++) {
      this.cells[gz] = [];
      for (let gx = 0; gx < this.cols; gx++) {
        this.cells[gz][gx] = 0;
      }
    }

    this.gridGroup = new THREE.Group();
    this.gridGroup.name = 'GridVisual';

    this._buildCellSurfaces();
    this._buildRoadMarkings();
    this._buildGridLines();
  }

  // ========================
  //   ROAD / SIDEWALK DETECTION
  // ========================

  isMainRoad(gx, gz) {
    return gx === this.mainRoadX || gz === this.mainRoadZ;
  }

  isRoad(gx, gz) {
    return (gx % this.roadInterval === 0) || (gz % this.roadInterval === 0);
  }

  isMainSidewalk(gx, gz) {
    if (this.isRoad(gx, gz)) return false;
    const neighbors = [
      [gx - 1, gz], [gx + 1, gz],
      [gx, gz - 1], [gx, gz + 1],
    ];
    return neighbors.some(([nx, nz]) =>
      this.inBounds(nx, nz) && this.isMainRoad(nx, nz)
    );
  }

  isSidewalk(gx, gz) {
    if (this.isRoad(gx, gz)) return false;
    const neighbors = [
      [gx - 1, gz], [gx + 1, gz],
      [gx, gz - 1], [gx, gz + 1],
    ];
    return neighbors.some(([nx, nz]) =>
      this.inBounds(nx, nz) && this.isRoad(nx, nz)
    );
  }

  isIntersection(gx, gz) {
    return (gx % this.roadInterval === 0) && (gz % this.roadInterval === 0);
  }

  // ========================
  //   DATA ACCESS METHODS
  // ========================

  setCell(gx, gz, value) {
    if (!this.inBounds(gx, gz)) return;
    this.cells[gz][gx] = value;
  }

  getCell(gx, gz) {
    if (!this.inBounds(gx, gz)) return -1;
    return this.cells[gz][gx];
  }

  isWalkable(gx, gz) {
    if (!this.inBounds(gx, gz)) return false;
    return this.cells[gz][gx] === 0;
  }

  inBounds(gx, gz) {
    return gx >= 0 && gx < this.cols && gz >= 0 && gz < this.rows;
  }

  // ========================
  //   COORDINATE CONVERSION
  // ========================

  gridToWorld(gx, gz) {
    const x = this.offsetX + gx * this.cellSize + this.cellSize / 2;
    const z = this.offsetZ + gz * this.cellSize + this.cellSize / 2;
    return { x, z };
  }

  worldToGrid(x, z) {
    const gx = Math.floor((x - this.offsetX) / this.cellSize);
    const gz = Math.floor((z - this.offsetZ) / this.cellSize);
    return { gx, gz };
  }

  // ========================
  //   DISTANCE FROM CENTER
  // ========================

  distFromCenter(gx, gz) {
    const cx = this.cols / 2, cz = this.rows / 2;
    return Math.max(Math.abs(gx - cx) / cx, Math.abs(gz - cz) / cz);
  }

  // ========================
  //   VISUAL: CELL SURFACES
  // ========================

  _buildCellSurfaces() {
    const yPlane = 0.015;
    const curbHeight = 0.06; // Tinggi trotoar
    
    const roadGeom = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
    const mainRoadGeom = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
    
    // Trotoar menggunakan BoxGeometry agar terlihat lebih tinggi (curb)
    const curbGeom = new THREE.BoxGeometry(this.cellSize, curbHeight, this.cellSize);

    // Dubai-style colors — clean & bright
    const roadBase = new THREE.Color('#353535');       // Aspal abu-abu gelap
    const mainRoadBase = new THREE.Color('#2a2a2a');   // Main road sedikit lebih gelap
    const sidewalkBase = new THREE.Color('#e0e0e0');   // Trotoar beton terang
    const mainSidewalkBase = new THREE.Color('#d0d0d0');
    const grassBase = new THREE.Color('#68c958');

    for (let gz = 0; gz < this.rows; gz++) {
      for (let gx = 0; gx < this.cols; gx++) {
        let baseColor;
        let roughness;
        let geom;
        let isRaised = false;

        if (this.isMainRoad(gx, gz) && this.isRoad(gx, gz)) {
          baseColor = mainRoadBase.clone();
          baseColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.01);
          roughness = 0.75; // Aspal halus
          geom = mainRoadGeom;
        } else if (this.isRoad(gx, gz)) {
          baseColor = roadBase.clone();
          baseColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.01);
          roughness = 0.80; // Aspal halus
          geom = roadGeom;
        } else if (this.isMainSidewalk(gx, gz)) {
          baseColor = mainSidewalkBase.clone();
          baseColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.02);
          roughness = 0.85; // Beton terang
          geom = curbGeom;
          isRaised = true;
        } else if (this.isSidewalk(gx, gz)) {
          baseColor = sidewalkBase.clone();
          baseColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.02);
          roughness = 0.85; // Beton terang
          geom = curbGeom;
          isRaised = true;
        } else {
          baseColor = grassBase.clone();
          baseColor.offsetHSL((Math.random() - 0.5) * 0.02, 0, (Math.random() - 0.5) * 0.05);
          roughness = 0.95;
          geom = curbGeom;
          isRaised = true;
        }

        const mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness,
          metalness: 0.0,
        });

        const worldPos = this.gridToWorld(gx, gz);
        const mesh = new THREE.Mesh(geom, mat);
        
        if (!isRaised) {
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.set(worldPos.x, yPlane, worldPos.z);
        } else {
          // BoxGeometry center is at 0, so raise it by half height
          mesh.position.set(worldPos.x, curbHeight / 2, worldPos.z);
        }
        
        mesh.receiveShadow = true;
        mesh.castShadow = isRaised;
        this.gridGroup.add(mesh);
      }
    }
  }

  // ========================
  //   VISUAL: ROAD MARKINGS
  // ========================

  _buildRoadMarkings() {
    const y = 0.025;
    const markingMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.5,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85, // Garis putih tebal dan jelas
    });

    const crosswalkMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.5,
      metalness: 0.1,
      transparent: true,
      opacity: 0.90, // Zebra cross sangat tebal
    });

    for (let gz = 0; gz < this.rows; gz++) {
      for (let gx = 0; gx < this.cols; gx++) {
        if (!this.isRoad(gx, gz)) continue;

        const worldPos = this.gridToWorld(gx, gz);
        const isHRoad = gz % this.roadInterval === 0;
        const isVRoad = gx % this.roadInterval === 0;

        if (this.isIntersection(gx, gz)) {
          const stripeCount = 5; // Lebih banyak zebra cross
          const stripeW = this.cellSize * 0.15; // Lebih tebal
          const stripeH = this.cellSize * 0.75;
          const spacing = this.cellSize / (stripeCount + 1);
          for (let i = 0; i < stripeCount; i++) {
            const stripeGeo = new THREE.PlaneGeometry(stripeW, stripeH);
            const stripe = new THREE.Mesh(stripeGeo, crosswalkMat);
            stripe.rotation.x = -Math.PI / 2;
            stripe.position.set(
              worldPos.x - this.cellSize * 0.40 + spacing * (i + 1),
              y + 0.002,
              worldPos.z
            );
            stripe.receiveShadow = true;
            this.gridGroup.add(stripe);
          }
          continue;
        }

        if (isVRoad && !isHRoad) {
          const dashGeo = new THREE.PlaneGeometry(0.1, this.cellSize * 0.4); // Lebih tebal
          const dash = new THREE.Mesh(dashGeo, markingMat);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(worldPos.x, y, worldPos.z);
          dash.receiveShadow = true;
          this.gridGroup.add(dash);
        }

        if (isHRoad && !isVRoad) {
          const dashGeo = new THREE.PlaneGeometry(this.cellSize * 0.4, 0.1); // Lebih tebal
          const dash = new THREE.Mesh(dashGeo, markingMat);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(worldPos.x, y, worldPos.z);
          dash.receiveShadow = true;
          this.gridGroup.add(dash);
        }
      }
    }
  }

  // ========================
  //   VISUAL: GRID LINES — sangat tipis & transparan
  // ========================

  _buildGridLines() {
    const totalWidth = this.cols * this.cellSize;
    const totalDepth = this.rows * this.cellSize;
    const y = 0.035;

    // Sangat tipis & transparan — hanya guide
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.04,
    });

    for (let i = 0; i <= this.cols; i++) {
      const x = this.offsetX + i * this.cellSize;
      const points = [
        new THREE.Vector3(x, y, this.offsetZ),
        new THREE.Vector3(x, y, this.offsetZ + totalDepth),
      ];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      this.gridGroup.add(new THREE.Line(geom, material));
    }

    for (let j = 0; j <= this.rows; j++) {
      const z = this.offsetZ + j * this.cellSize;
      const points = [
        new THREE.Vector3(this.offsetX, y, z),
        new THREE.Vector3(this.offsetX + totalWidth, y, z),
      ];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      this.gridGroup.add(new THREE.Line(geom, material));
    }
  }

  addToScene(scene) {
    scene.add(this.gridGroup);
  }
}
