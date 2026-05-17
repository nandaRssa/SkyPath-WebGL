import * as THREE from 'three';

const MODES = ['FREE', 'FOLLOW', 'FPV'];

export class FPVCameraController {

  constructor(options = {}) {
    const { drone, camera, scene, movementSystem, orbitControls, domElement } = options;

    this.drone = drone;
    this.camera = camera;
    this.scene = scene;
    this.movementSystem = movementSystem;
    this.orbitControls = orbitControls;
    this.domElement = domElement;

    if (!this.drone || !this.camera || !this.scene) {
      console.warn('[FPVCameraController] Missing references');
    }

    this.mode = 'FOLLOW';
    this.isTransitioning = false;
    this.transitionProgress = 0;
    this.transitionDuration = 0.5;
    this.startPosition = this.camera.position.clone();
    this.startQuaternion = this.camera.quaternion.clone();
    this.targetPosition = new THREE.Vector3();
    this.targetQuaternion = new THREE.Quaternion();

    // FOLLOW — drone-local spherical coordinates
    this._followRadius = 50;
    this._followTheta = 0;
    this._followPhi = 0.6;

    // FPV
    this.fpvOffset = new THREE.Vector3(0, 0.5, -0.2);

    // Helpers
    this._worldOffset = new THREE.Vector3();
    this._tempCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 800);
    this._localOffset = new THREE.Vector3();
    this._invQuat = new THREE.Quaternion();

    // Mouse orbit for FOLLOW mode
    this._isOrbiting = false;
    this._lastPointer = { x: 0, y: 0 };
    this._boundPointerDown = this._onPointerDown.bind(this);
    this._boundPointerMove = this._onPointerMove.bind(this);
    this._boundPointerUp = this._onPointerUp.bind(this);
    this._boundWheel = this._onWheel.bind(this);
    if (this.domElement) {
      this.domElement.addEventListener('pointerdown', this._boundPointerDown);
      this.domElement.addEventListener('pointermove', this._boundPointerMove);
      this.domElement.addEventListener('pointerup', this._boundPointerUp);
      this.domElement.addEventListener('wheel', this._boundWheel, { passive: false });
    }

    // Init controls
    if (this.orbitControls) {
      this.orbitControls.enabled = false;
    }

    console.log('[FPVCameraController] Initialized');
  }

  preUpdate(dt) {
    // Not needed — all modes set camera in update()
  }

  update(dt) {
    if (!this.drone || !this.camera) return;

    if (this.isTransitioning) {
      this._handleTransition(dt);
      return;
    }

    switch (this.mode) {
      case 'FREE':
        break;
      case 'FOLLOW':
        this._updateFollow(dt);
        break;
      case 'FPV':
        this._updateFPV(dt);
        break;
    }
  }

  toggleMode() {
    const idx = MODES.indexOf(this.mode);
    this.setMode(MODES[(idx + 1) % MODES.length]);
  }

  setMode(newMode) {
    if (newMode === this.mode) return;

    const oldMode = this.mode;
    this.mode = newMode;

    if (newMode === 'FREE') {
      this.isTransitioning = false;
      if (this.orbitControls) {
        this.orbitControls.enabled = true;
        this.orbitControls.target.copy(this.drone.position);
        this.orbitControls.update();
      }
    } else {
      this.isTransitioning = true;
      this.transitionProgress = 0;
      this.startPosition = this.camera.position.clone();
      this.startQuaternion = this.camera.quaternion.clone();
      if (this.orbitControls) {
        this.orbitControls.enabled = false;
        this.orbitControls.target.copy(this.drone.position);
      }
      if (newMode === 'FOLLOW') {
        this._followRadius = 50;
        this._followTheta = 0;
        this._followPhi = 0.6;
      }
    }
    console.log(`[FPVCameraController] ${oldMode} → ${newMode}`);
  }

  // =====================================
  // FOLLOW — drone-local chase cam
  // =====================================

  _updateFollow(dt) {
    const { _followRadius: r, _followTheta: t, _followPhi: p } = this;
    // drone forward = -Z, jadi +Z = belakang drone
    this._localOffset.set(
      r * Math.cos(p) * Math.sin(t),
      r * Math.sin(p),
      r * Math.cos(p) * Math.cos(t)
    );
    this._localOffset.applyQuaternion(this.drone.quaternion);
    this.camera.position.copy(this.drone.position).add(this._localOffset);
    this.camera.lookAt(this.drone.position);
  }

  // =====================================
  // FPV
  // =====================================

  _updateFPV(dt) {
    this.targetPosition = this._getWorldPosition(this.fpvOffset);
    this.camera.position.lerp(this.targetPosition, 0.15);
    this.camera.quaternion.copy(this.drone.quaternion);
  }

  // =====================================
  // TRANSITION
  // =====================================

  _handleTransition(dt) {
    this.transitionProgress += (1 / this.transitionDuration) * dt;
    if (this.transitionProgress > 1) this.transitionProgress = 1;

    if (this.mode === 'FPV') {
      this.targetPosition.copy(this._getWorldPosition(this.fpvOffset));
      this.targetQuaternion.copy(this.drone.quaternion);
    } else if (this.mode === 'FOLLOW') {
      this._computeFollowTarget();
      this._tempCamera.position.copy(this.targetPosition);
      this._tempCamera.lookAt(this.drone.position);
      this.targetQuaternion.copy(this._tempCamera.quaternion);
    }

    this.camera.position.lerpVectors(this.startPosition, this.targetPosition, this.transitionProgress);
    this.camera.quaternion.slerpQuaternions(this.startQuaternion, this.targetQuaternion, this.transitionProgress);

    if (this.transitionProgress >= 1) {
      this.isTransitioning = false;
      console.log('[FPVCameraController] Transition done');
    }
  }

  _computeFollowTarget() {
    const { _followRadius: r, _followTheta: t, _followPhi: p } = this;
    this._localOffset.set(
      r * Math.cos(p) * Math.sin(t),
      r * Math.sin(p),
      r * Math.cos(p) * Math.cos(t)
    );
    this._localOffset.applyQuaternion(this.drone.quaternion);
    this.targetPosition.copy(this.drone.position).add(this._localOffset);
  }

  _getWorldPosition(relativeOffset) {
    this._worldOffset.copy(relativeOffset);
    this._worldOffset.applyQuaternion(this.drone.quaternion);
    this._worldOffset.add(this.drone.position);
    return this._worldOffset;
  }

  // =====================================
  // MOUSE — untuk FOLLOW mode
  // =====================================

  _onPointerDown(e) {
    if (e.button !== 2 || this.mode !== 'FOLLOW') return;
    this._isOrbiting = true;
    this._lastPointer.x = e.clientX;
    this._lastPointer.y = e.clientY;
  }

  _onPointerMove(e) {
    if (!this._isOrbiting || this.mode !== 'FOLLOW') return;
    const dx = e.clientX - this._lastPointer.x;
    const dy = e.clientY - this._lastPointer.y;
    this._followTheta += dx * 0.008;
    this._followPhi -= dy * 0.008;
    this._followPhi = Math.max(-1.4, Math.min(1.4, this._followPhi));
    this._lastPointer.x = e.clientX;
    this._lastPointer.y = e.clientY;
  }

  _onPointerUp(e) {
    if (e.button !== 2) return;
    this._isOrbiting = false;
  }

  _onWheel(e) {
    if (this.mode !== 'FOLLOW') return;
    e.preventDefault();
    this._followRadius *= e.deltaY > 0 ? 1.06 : 0.94;
    this._followRadius = Math.max(3, Math.min(500, this._followRadius));
  }

  dispose() {
    if (this.domElement) {
      this.domElement.removeEventListener('pointerdown', this._boundPointerDown);
      this.domElement.removeEventListener('pointermove', this._boundPointerMove);
      this.domElement.removeEventListener('pointerup', this._boundPointerUp);
      this.domElement.removeEventListener('wheel', this._boundWheel);
    }
  }
}
