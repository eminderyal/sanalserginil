import * as THREE from 'three';
import { Exhibit, TimeOfDay, CameraMode, PlayerState } from '../types';
import { ProceduralSiteBuilder } from './ProceduralSiteBuilder';
import { PlinthBuilder } from './PlinthBuilder';
import { soundManager } from '../audio/soundManager';

export class ExhibitionScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private siteBuilder: ProceduralSiteBuilder;
  private plinthBuilder: PlinthBuilder;

  // Lighting
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private ambientLight: THREE.AmbientLight;
  private braziers: THREE.PointLight[] = [];
  private dustParticles: THREE.Points | null = null;
  private plinthsGroup: THREE.Group;
  private interactiveMeshes: THREE.Mesh[] = [];
  private beaconMeshes: THREE.Mesh[] = [];

  // Camera & Navigation State
  private cameraMode: CameraMode = 'first_person';
  private timeOfDay: TimeOfDay = 'night';
  private siteRadius = 26;

  // First-Person Walk Controls
  private playerPos = new THREE.Vector3(0, 1.7, 12);
  private playerRotation = { yaw: 0, pitch: 0 };
  private keysPressed: { [key: string]: boolean } = {};
  private moveSpeed = 6.5; // units/sec
  private isPointerLocked = false;
  private isMouseDown = false;
  private lastMousePos = { x: 0, y: 0 };
  private touchJoyMove = { x: 0, y: 0 };
  private touchLookDelta = { x: 0, y: 0 };

  // Orbit Controls State
  private orbitTarget = new THREE.Vector3(0, 1.5, 0);
  private orbitDistance = 28;
  private orbitTheta = 0; // horizontal angle
  private orbitPhi = Math.PI / 4; // vertical elevation

  // Cinematic Exhibit Focus Transition
  private isTransitioning = false;
  private transitionStartCam = new THREE.Vector3();
  private transitionTargetCam = new THREE.Vector3();
  private transitionStartLook = new THREE.Vector3();
  private transitionTargetLook = new THREE.Vector3();
  private transitionProgress = 0;
  private transitionDuration = 1.2;

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2(-1000, -1000);
  private hoveredExhibit: Exhibit | null = null;

  // Callbacks
  private onExhibitClickCallback?: (exhibit: Exhibit) => void;
  private onExhibitHoverCallback?: (exhibit: Exhibit | null) => void;
  private onPlayerMoveCallback?: (state: PlayerState) => void;

  private clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private isDisposed = false;

  // Touch Interaction State for Mobile Navigation
  private lastTouchPos = { x: 0, y: 0 };
  private touchStartPos = { x: 0, y: 0 };
  private touchStartTime = 0;
  private lastPinchDist = 0;
  private isTouching = false;

  constructor(
    container: HTMLElement,
    initialExhibits: Exhibit[],
    options?: {
      onExhibitClick?: (exhibit: Exhibit) => void;
      onExhibitHover?: (exhibit: Exhibit | null) => void;
      onPlayerMove?: (state: PlayerState) => void;
      timeOfDay?: TimeOfDay;
      cameraMode?: CameraMode;
    }
  ) {
    this.container = container;
    this.onExhibitClickCallback = options?.onExhibitClick;
    this.onExhibitHoverCallback = options?.onExhibitHover;
    this.onPlayerMoveCallback = options?.onPlayerMove;
    if (options?.timeOfDay) this.timeOfDay = options.timeOfDay;
    if (options?.cameraMode) this.cameraMode = options.cameraMode;

    // 1. Three.js Scene & Renderer Setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xe8d0b2, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.1,
      1200
    );
    this.camera.position.copy(this.playerPos);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.style.touchAction = 'none';

    container.appendChild(this.renderer.domElement);

    // 2. Global Lights
    this.hemiLight = new THREE.HemisphereLight(0xffeedd, 0x887766, 0.9);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffe8d0, 0.6);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff0d0, 2.0);
    this.dirLight.position.set(28, 45, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 120;
    const d = 35;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // 3. Builders
    this.siteBuilder = new ProceduralSiteBuilder();
    this.plinthBuilder = new PlinthBuilder();

    const siteData = this.siteBuilder.buildSite(this.scene);
    this.braziers = siteData.braziers;
    this.dustParticles = siteData.particles;

    this.plinthsGroup = new THREE.Group();
    this.plinthsGroup.name = 'PlinthsGroup';
    this.scene.add(this.plinthsGroup);

    this.updateExhibits(initialExhibits);
    this.setTimeOfDay(this.timeOfDay);

    // 4. Event Listeners
    this.initEventListeners();

    // 5. Start Animation Loop
    this.animate();
  }

  private calculateSiteRadius(exhibits: Exhibit[]): number {
    let maxDist = 20;
    exhibits.forEach((ex) => {
      if (ex && ex.position) {
        const dist = Math.hypot(ex.position[0], ex.position[2]);
        if (dist > maxDist) maxDist = dist;
      }
    });
    // Scale dynamically with exhibit count (guarantees spaciousness as up to 500+ artifacts are added)
    const countRadius = Math.max(24, Math.sqrt(Math.max(1, exhibits.length)) * 3.8 + 12);
    return Math.max(26, maxDist + 12, countRadius);
  }

  public updateExhibits(exhibits: Exhibit[]) {
    // Dynamically calculate the required sanctuary size to host all artifacts
    this.siteRadius = this.calculateSiteRadius(exhibits);
    this.siteBuilder.updateSiteSize(this.siteRadius);

    // Update shadow map boundaries so the extended area receives clean shadows
    const shadowBound = Math.max(35, this.siteRadius + 15);
    this.dirLight.shadow.camera.left = -shadowBound;
    this.dirLight.shadow.camera.right = shadowBound;
    this.dirLight.shadow.camera.top = shadowBound;
    this.dirLight.shadow.camera.bottom = -shadowBound;
    this.dirLight.shadow.camera.updateProjectionMatrix();

    // Clear existing plinths
    while (this.plinthsGroup.children.length > 0) {
      const obj = this.plinthsGroup.children[0];
      this.plinthsGroup.remove(obj);
    }
    this.interactiveMeshes = [];
    this.beaconMeshes = [];

    exhibits.forEach((exhibit) => {
      const { group, interactiveMesh, beacon } = this.plinthBuilder.createPlinth(exhibit);
      this.plinthsGroup.add(group);
      this.interactiveMeshes.push(interactiveMesh);
      this.beaconMeshes.push(beacon);
    });
  }

  public setTimeOfDay(time: TimeOfDay) {
    this.timeOfDay = time;
    if (!this.scene) return;

    if (time === 'day') {
      this.scene.background = new THREE.Color(0x8ecae6);
      this.scene.fog = new THREE.FogExp2(0xcfe2f3, 0.012);
      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0xb0a592);
      this.hemiLight.intensity = 1.0;
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.7;
      this.dirLight.color.setHex(0xfffaed);
      this.dirLight.intensity = 2.4;
      this.dirLight.position.set(15, 55, 10);
      this.renderer.toneMappingExposure = 1.15;
      this.braziers.forEach(b => { b.intensity = 0.3; });
    } else if (time === 'sunset') {
      // Natural warm golden-amber dusk & twilight
      this.scene.background = new THREE.Color(0xd48b55);
      this.scene.fog = new THREE.FogExp2(0xd69e78, 0.013);
      this.hemiLight.color.setHex(0xffc078);
      this.hemiLight.groundColor.setHex(0x523824);
      this.hemiLight.intensity = 0.85;
      this.ambientLight.color.setHex(0xffd5a5);
      this.ambientLight.intensity = 0.5;
      this.dirLight.color.setHex(0xffa452);
      this.dirLight.intensity = 2.3;
      this.dirLight.position.set(42, 18, 25);
      this.renderer.toneMappingExposure = 1.15;
      this.braziers.forEach(b => { b.intensity = 1.2; });
    } else {
      // night
      this.scene.background = new THREE.Color(0x0a0f1d);
      this.scene.fog = new THREE.FogExp2(0x0e1424, 0.022);
      this.hemiLight.color.setHex(0x3a506b);
      this.hemiLight.groundColor.setHex(0x0b132b);
      this.hemiLight.intensity = 0.35;
      this.ambientLight.color.setHex(0x1c2541);
      this.ambientLight.intensity = 0.25;
      this.dirLight.color.setHex(0x90e0ef);
      this.dirLight.intensity = 0.65;
      this.dirLight.position.set(20, 40, -15);
      this.renderer.toneMappingExposure = 1.35;
      this.braziers.forEach(b => { b.intensity = 3.5; });
    }
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    if (mode === 'orbit') {
      this.orbitTarget.set(0, 1.5, 0);
      this.updateOrbitCamera();
    } else if (mode === 'first_person') {
      this.camera.position.copy(this.playerPos);
      this.updateFirstPersonCamera();
    }
  }

  public focusOnExhibit(exhibit: Exhibit) {
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionStartCam.copy(this.camera.position);

    // Calculate position in front of the exhibit plinth
    const angle = exhibit.rotationY || 0;
    const standDist = 3.6;
    const targetX = exhibit.position[0] + Math.sin(angle) * standDist;
    const targetZ = exhibit.position[2] + Math.cos(angle) * standDist;
    const targetY = 2.3;

    this.transitionTargetCam.set(targetX, targetY, targetZ);
    this.playerPos.set(targetX, 1.7, targetZ);
    this.playerRotation.yaw = angle + Math.PI;
    this.playerRotation.pitch = -0.05;

    // Target look-at point: center of the artifact picture
    this.transitionTargetLook.set(exhibit.position[0], 2.4, exhibit.position[2]);

    // Current look-at vector
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.transitionStartLook.copy(this.camera.position).add(dir.multiplyScalar(10));

    soundManager.playExhibitChime();
  }

  public teleportToPosition(x: number, z: number) {
    soundManager.playTeleport();
    this.playerPos.set(x, 1.7, z);
    if (this.cameraMode === 'first_person') {
      this.camera.position.copy(this.playerPos);
    }
    if (this.onPlayerMoveCallback) {
      this.onPlayerMoveCallback({
        x: this.playerPos.x,
        z: this.playerPos.z,
        rotationY: this.playerRotation.yaw,
      });
    }
  }

  public setTouchJoystickMove(x: number, y: number) {
    this.touchJoyMove = { x, y };
  }

  public setTouchLookDelta(dx: number, dy: number) {
    this.playerRotation.yaw -= dx * 0.005;
    this.playerRotation.pitch -= dy * 0.005;
    this.playerRotation.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.playerRotation.pitch));
  }

  private initEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);

    const el = this.renderer.domElement;
    el.addEventListener('mousedown', this.handleMouseDown);
    el.addEventListener('mousemove', this.handleMouseMove);
    el.addEventListener('mouseup', this.handleMouseUp);
    el.addEventListener('wheel', this.handleWheel, { passive: false });
    el.addEventListener('click', this.handleClick);

    // Mobile touch controls
    el.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    el.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    el.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keysPressed[e.code] = true;
    soundManager.startAmbient();
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysPressed[e.code] = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    this.isMouseDown = true;
    this.lastMousePos = { x: e.clientX, y: e.clientY };
    soundManager.startAmbient();
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isMouseDown) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.lastMousePos = { x: e.clientX, y: e.clientY };

      if (this.cameraMode === 'first_person' && !this.isTransitioning) {
        this.playerRotation.yaw -= dx * 0.0035;
        this.playerRotation.pitch -= dy * 0.0035;
        this.playerRotation.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.playerRotation.pitch));
      } else if (this.cameraMode === 'orbit') {
        this.orbitTheta -= dx * 0.006;
        this.orbitPhi = Math.max(0.1, Math.min(Math.PI / 2.1, this.orbitPhi - dy * 0.006));
        this.updateOrbitCamera();
      }
    }

    // Raycast hover check
    this.checkHover();
  };

  private handleMouseUp = () => {
    this.isMouseDown = false;
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.cameraMode === 'orbit') {
      e.preventDefault();
      const maxOrbit = Math.max(65, this.siteRadius * 2.2);
      this.orbitDistance = Math.max(8, Math.min(maxOrbit, this.orbitDistance + e.deltaY * 0.03));
      this.updateOrbitCamera();
    }
  };

  private handleClick = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseVec, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const exhibit = hit.userData.exhibit as Exhibit;
      if (exhibit && this.onExhibitClickCallback) {
        this.focusOnExhibit(exhibit);
        this.onExhibitClickCallback(exhibit);
      }
    }
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.isTouching = true;
      this.lastTouchPos = { x: t.clientX, y: t.clientY };
      this.touchStartPos = { x: t.clientX, y: t.clientY };
      this.touchStartTime = performance.now();
      soundManager.startAmbient();
    } else if (e.touches.length === 2) {
      this.lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }

    if (e.touches.length === 1 && this.isTouching) {
      const t = e.touches[0];
      const dx = t.clientX - this.lastTouchPos.x;
      const dy = t.clientY - this.lastTouchPos.y;
      this.lastTouchPos = { x: t.clientX, y: t.clientY };

      if (this.cameraMode === 'first_person' && !this.isTransitioning) {
        this.playerRotation.yaw -= dx * 0.0045;
        this.playerRotation.pitch -= dy * 0.0045;
        this.playerRotation.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.playerRotation.pitch));
      } else if (this.cameraMode === 'orbit') {
        this.orbitTheta -= dx * 0.007;
        this.orbitPhi = Math.max(0.1, Math.min(Math.PI / 2.1, this.orbitPhi - dy * 0.007));
        this.updateOrbitCamera();
      }
    } else if (e.touches.length === 2) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (this.lastPinchDist > 0 && this.cameraMode === 'orbit') {
        const pinchDelta = this.lastPinchDist - currentDist;
        this.orbitDistance = Math.max(8, Math.min(60, this.orbitDistance + pinchDelta * 0.08));
        this.updateOrbitCamera();
      }
      this.lastPinchDist = currentDist;
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      this.isTouching = false;
      this.lastPinchDist = 0;

      // Detect quick tap (<350ms, <15px delta)
      const duration = performance.now() - this.touchStartTime;
      const changedTouch = e.changedTouches[0];
      if (changedTouch && duration < 350) {
        const dist = Math.hypot(
          changedTouch.clientX - this.touchStartPos.x,
          changedTouch.clientY - this.touchStartPos.y
        );
        if (dist < 15) {
          const rect = this.renderer.domElement.getBoundingClientRect();
          this.mouseVec.x = ((changedTouch.clientX - rect.left) / rect.width) * 2 - 1;
          this.mouseVec.y = -((changedTouch.clientY - rect.top) / rect.height) * 2 + 1;

          this.raycaster.setFromCamera(this.mouseVec, this.camera);
          const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

          if (intersects.length > 0) {
            const hit = intersects[0].object;
            const exhibit = hit.userData.exhibit as Exhibit;
            if (exhibit && this.onExhibitClickCallback) {
              this.focusOnExhibit(exhibit);
              this.onExhibitClickCallback(exhibit);
            }
          }
        }
      }
    }
  };

  private checkHover() {
    this.raycaster.setFromCamera(this.mouseVec, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const exhibit = hit.userData.exhibit as Exhibit;
      if (this.hoveredExhibit?.id !== exhibit?.id) {
        this.hoveredExhibit = exhibit;
        this.renderer.domElement.style.cursor = 'pointer';
        if (this.onExhibitHoverCallback) this.onExhibitHoverCallback(exhibit);
      }
    } else {
      if (this.hoveredExhibit !== null) {
        this.hoveredExhibit = null;
        this.renderer.domElement.style.cursor = 'default';
        if (this.onExhibitHoverCallback) this.onExhibitHoverCallback(null);
      }
    }
  }

  private handleResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private updateOrbitCamera() {
    const x = this.orbitTarget.x + this.orbitDistance * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);
    const y = this.orbitTarget.y + this.orbitDistance * Math.cos(this.orbitPhi);
    const z = this.orbitTarget.z + this.orbitDistance * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.orbitTarget);
  }

  private updateFirstPersonCamera() {
    const dir = new THREE.Vector3(
      Math.sin(this.playerRotation.yaw) * Math.cos(this.playerRotation.pitch),
      Math.sin(this.playerRotation.pitch),
      Math.cos(this.playerRotation.yaw) * Math.cos(this.playerRotation.pitch)
    );
    const lookTarget = this.camera.position.clone().add(dir);
    this.camera.lookAt(lookTarget);
  }

  private updateMovement(delta: number) {
    if (this.cameraMode !== 'first_person' || this.isTransitioning) return;

    let moveX = 0;
    let moveZ = 0;

    // Keyboard controls
    if (this.keysPressed['KeyW'] || this.keysPressed['ArrowUp']) moveZ -= 1;
    if (this.keysPressed['KeyS'] || this.keysPressed['ArrowDown']) moveZ += 1;
    if (this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft']) moveX -= 1;
    if (this.keysPressed['KeyD'] || this.keysPressed['ArrowRight']) moveX += 1;

    // Touch Joystick addition
    if (Math.abs(this.touchJoyMove.x) > 0.1 || Math.abs(this.touchJoyMove.y) > 0.1) {
      moveX += this.touchJoyMove.x;
      moveZ -= this.touchJoyMove.y;
    }

    if (moveX !== 0 || moveZ !== 0) {
      const isSprinting = this.keysPressed['ShiftLeft'] || this.keysPressed['ShiftRight'];
      const speed = this.moveSpeed * (isSprinting ? 1.75 : 1.0) * delta;

      // Normalize vector
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      const normX = moveX / length;
      const normZ = moveZ / length;

      // Forward/Right vectors based on yaw
      const forward = new THREE.Vector3(Math.sin(this.playerRotation.yaw), 0, Math.cos(this.playerRotation.yaw));
      const right = new THREE.Vector3(-Math.cos(this.playerRotation.yaw), 0, Math.sin(this.playerRotation.yaw));

      const displacement = new THREE.Vector3()
        .addScaledVector(forward, -normZ * speed)
        .addScaledVector(right, normX * speed);

      this.playerPos.add(displacement);

      // Clamp player within dynamic archaeological site boundary
      const maxSiteDist = Math.max(26, this.siteRadius - 1.5);
      this.playerPos.x = Math.max(-maxSiteDist, Math.min(maxSiteDist, this.playerPos.x));
      this.playerPos.z = Math.max(-maxSiteDist, Math.min(maxSiteDist, this.playerPos.z));
      this.playerPos.y = 1.7;

      this.camera.position.copy(this.playerPos);
      soundManager.playFootstep();

      if (this.onPlayerMoveCallback) {
        this.onPlayerMoveCallback({
          x: this.playerPos.x,
          z: this.playerPos.z,
          rotationY: this.playerRotation.yaw,
        });
      }
    }
  }

  private animate = () => {
    if (this.isDisposed) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // 1. Dust Motes drift
    if (this.dustParticles) {
      const posAttr = this.dustParticles.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) + Math.sin(time * 0.8 + i) * 0.005;
        let x = posAttr.getX(i) + Math.cos(time * 0.4 + i) * 0.006;
        if (y > 9) y = 0.5;
        posAttr.setY(i, y);
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;
    }

    // 2. Brazier flame light flicker
    this.braziers.forEach((b, idx) => {
      const baseInt = (this.timeOfDay === 'night' ? 3.5 : this.timeOfDay === 'sunset' ? 2.2 : 0.8);
      b.intensity = baseInt + Math.sin(time * 12 + idx * 2.5) * 0.35 + Math.cos(time * 18 + idx) * 0.2;
    });

    // 3. Ground Beacon pulse animation
    this.beaconMeshes.forEach((beacon) => {
      const scale = 1.0 + Math.sin(time * 3) * 0.08;
      beacon.scale.set(scale, scale, 1);
    });

    // 4. Handle smooth camera transition to active exhibit
    if (this.isTransitioning) {
      this.transitionProgress += delta / this.transitionDuration;
      const t = Math.min(1.0, this.transitionProgress);
      // Ease out cubic
      const easeT = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(this.transitionStartCam, this.transitionTargetCam, easeT);
      const currentLook = new THREE.Vector3().lerpVectors(
        this.transitionStartLook,
        this.transitionTargetLook,
        easeT
      );
      this.camera.lookAt(currentLook);

      if (t >= 1.0) {
        this.isTransitioning = false;
        if (this.cameraMode === 'first_person') {
          this.updateFirstPersonCamera();
        }
      }
    } else {
      // Normal camera update
      if (this.cameraMode === 'first_person') {
        this.updateMovement(delta);
        this.updateFirstPersonCamera();
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    this.isDisposed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);

    const el = this.renderer.domElement;
    el.removeEventListener('mousedown', this.handleMouseDown);
    el.removeEventListener('mousemove', this.handleMouseMove);
    el.removeEventListener('mouseup', this.handleMouseUp);
    el.removeEventListener('wheel', this.handleWheel);
    el.removeEventListener('click', this.handleClick);
    el.removeEventListener('touchstart', this.handleTouchStart);
    el.removeEventListener('touchmove', this.handleTouchMove);
    el.removeEventListener('touchend', this.handleTouchEnd);
    el.removeEventListener('touchcancel', this.handleTouchEnd);

    if (this.container && el.parentNode === this.container) {
      this.container.removeChild(el);
    }
    this.renderer.dispose();
  }
}
