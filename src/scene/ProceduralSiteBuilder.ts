import * as THREE from 'three';

export class ProceduralSiteBuilder {
  private materials: { [key: string]: THREE.Material } = {};
  private textures: { [key: string]: THREE.Texture } = {};
  private terrainMesh: THREE.Mesh | null = null;
  private agoraMesh: THREE.Mesh | null = null;
  private baseStepMesh: THREE.Mesh | null = null;
  private colonnadeGroup: THREE.Group | null = null;
  private currentSiteRadius = 24;

  constructor() {
    this.initTexturesAndMaterials();
  }

  private initTexturesAndMaterials() {
    // 1. Procedural Stone Paver Texture
    const stoneCanvas = document.createElement('canvas');
    stoneCanvas.width = 512;
    stoneCanvas.height = 512;
    const ctx = stoneCanvas.getContext('2d')!;

    // Warm limestone base
    ctx.fillStyle = '#c8b69b';
    ctx.fillRect(0, 0, 512, 512);

    // Stone tile grid with irregular stone joints
    const tileSize = 64;
    for (let y = 0; y < 512; y += tileSize) {
      for (let x = 0; x < 512; x += tileSize) {
        const offset = (Math.floor(y / tileSize) % 2) * (tileSize / 2);
        const tileX = (x + offset) % 512;
        
        // Random slight tint per tile
        const toneVar = Math.floor((Math.random() - 0.5) * 20);
        ctx.fillStyle = `rgb(${195 + toneVar}, ${180 + toneVar}, ${155 + toneVar})`;
        ctx.fillRect(tileX + 2, y + 2, tileSize - 4, tileSize - 4);

        // Stone grain specks
        for (let s = 0; s < 40; s++) {
          const sx = tileX + 2 + Math.random() * (tileSize - 4);
          const sy = y + 2 + Math.random() * (tileSize - 4);
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)';
          ctx.fillRect(sx, sy, 2, 2);
        }
      }
    }

    // Weathered grout lines
    ctx.strokeStyle = '#7c6a53';
    ctx.lineWidth = 3;
    for (let y = 0; y <= 512; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    for (let y = 0; y < 512; y += tileSize) {
      const offset = (Math.floor(y / tileSize) % 2) * (tileSize / 2);
      for (let x = 0; x <= 512; x += tileSize) {
        const lineX = (x + offset) % 512;
        ctx.beginPath();
        ctx.moveTo(lineX, y);
        ctx.lineTo(lineX, y + tileSize);
        ctx.stroke();
      }
    }

    const stoneTex = new THREE.CanvasTexture(stoneCanvas);
    stoneTex.wrapS = THREE.RepeatWrapping;
    stoneTex.wrapT = THREE.RepeatWrapping;
    stoneTex.repeat.set(16, 16);
    this.textures['stone_pavers'] = stoneTex;

    // 2. Weathered Marble Texture for Columns and Plinths
    const marbleCanvas = document.createElement('canvas');
    marbleCanvas.width = 512;
    marbleCanvas.height = 512;
    const mctx = marbleCanvas.getContext('2d')!;
    mctx.fillStyle = '#ded5c5';
    mctx.fillRect(0, 0, 512, 512);
    // Veins
    mctx.strokeStyle = 'rgba(140, 125, 105, 0.25)';
    mctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      mctx.beginPath();
      mctx.moveTo(Math.random() * 512, 0);
      mctx.bezierCurveTo(
        Math.random() * 512, 170,
        Math.random() * 512, 340,
        Math.random() * 512, 512
      );
      mctx.stroke();
    }
    const marbleTex = new THREE.CanvasTexture(marbleCanvas);
    marbleTex.wrapS = THREE.RepeatWrapping;
    marbleTex.wrapT = THREE.RepeatWrapping;
    this.textures['marble'] = marbleTex;

    // Materials
    this.materials['pavement'] = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.88,
      metalness: 0.05,
    });

    this.materials['marble_stone'] = new THREE.MeshStandardMaterial({
      map: marbleTex,
      color: 0xe8dfd1,
      roughness: 0.65,
      metalness: 0.1,
    });

    this.materials['weathered_rock'] = new THREE.MeshStandardMaterial({
      color: 0xa89b88,
      roughness: 0.95,
      metalness: 0.02,
    });

    this.materials['mediterranean_soil'] = new THREE.MeshStandardMaterial({
      color: 0x968368,
      roughness: 0.98,
      metalness: 0.0,
    });

    this.materials['bronze'] = new THREE.MeshStandardMaterial({
      color: 0x8c6d3b,
      roughness: 0.35,
      metalness: 0.85,
    });

    this.materials['cypress_foliage'] = new THREE.MeshStandardMaterial({
      color: 0x223c26,
      roughness: 0.8,
      metalness: 0.05,
    });

    this.materials['olive_foliage'] = new THREE.MeshStandardMaterial({
      color: 0x5a6d54,
      roughness: 0.75,
      metalness: 0.05,
    });

    this.materials['wood_trunk'] = new THREE.MeshStandardMaterial({
      color: 0x4a3828,
      roughness: 0.9,
    });

    this.materials['fire_glow'] = new THREE.MeshBasicMaterial({
      color: 0xff7722,
    });
  }

  public buildSite(scene: THREE.Scene): { braziers: THREE.PointLight[]; particles: THREE.Points } {
    const siteGroup = new THREE.Group();
    siteGroup.name = 'ArchaeologicalSite';

    // 1. Surrounding Terrain & Desert-Mediterranean Ground
    const terrainGeo = new THREE.PlaneGeometry(240, 240, 32, 32);
    // Add subtle undulations to periphery
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const distFromCenter = Math.sqrt(x * x + y * y);
      if (distFromCenter > 35) {
        const height = (Math.sin(x * 0.08) + Math.cos(y * 0.08)) * 1.5 + (distFromCenter - 35) * 0.08;
        posAttr.setZ(i, height);
      }
    }
    terrainGeo.computeVertexNormals();

    const terrainMesh = new THREE.Mesh(terrainGeo, this.materials['mediterranean_soil']);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.position.y = -0.05;
    terrainMesh.receiveShadow = true;
    siteGroup.add(terrainMesh);
    this.terrainMesh = terrainMesh;

    // 2. Central Sanctuary Agora (Paved Stone Terrace)
    const agoraGeo = new THREE.BoxGeometry(44, 0.4, 44);
    const agoraMesh = new THREE.Mesh(agoraGeo, this.materials['pavement']);
    agoraMesh.position.set(0, 0.15, 0);
    agoraMesh.receiveShadow = true;
    agoraMesh.castShadow = true;
    siteGroup.add(agoraMesh);
    this.agoraMesh = agoraMesh;

    // Agora Stepped Foundation Plinth
    const baseStepGeo = new THREE.BoxGeometry(46.5, 0.25, 46.5);
    const baseStepMesh = new THREE.Mesh(baseStepGeo, this.materials['marble_stone']);
    baseStepMesh.position.set(0, 0.05, 0);
    baseStepMesh.receiveShadow = true;
    siteGroup.add(baseStepMesh);
    this.baseStepMesh = baseStepMesh;

    // 3. Classical Colonnades (Perimeter Doric & Ionic Columns)
    this.colonnadeGroup = new THREE.Group();
    siteGroup.add(this.colonnadeGroup);
    this.buildColonnades(this.colonnadeGroup);

    // 4. Ruined Temples, Steps, and Porticos
    this.buildTempleRuins(siteGroup);

    // 5. Mediterranean Cypress & Olive Trees
    this.buildFlora(siteGroup);

    // 6. Ancient Stone Braziers with dynamic glowing embers
    const braziers = this.buildBraziers(siteGroup);

    // 7. Atmospheric Pollen / Golden Dust Particles in the breeze
    const particles = this.buildDustParticles(siteGroup);

    scene.add(siteGroup);

    return { braziers, particles };
  }

  /**
   * Dynamically extends the sanctuary ground, agora terrace, steps and landscape
   * when many artifacts are placed or placed further out in the 3D world.
   */
  public updateSiteSize(siteRadius: number) {
    this.currentSiteRadius = Math.max(24, siteRadius);
    const agoraSize = Math.max(48, this.currentSiteRadius * 2 + 16);

    if (this.agoraMesh) {
      this.agoraMesh.scale.set(agoraSize / 44, 1, agoraSize / 44);
      const stoneTex = this.textures['stone_pavers'];
      if (stoneTex) {
        stoneTex.repeat.set(Math.round(agoraSize / 2.75), Math.round(agoraSize / 2.75));
        stoneTex.needsUpdate = true;
      }
    }

    if (this.baseStepMesh) {
      const stepSize = agoraSize + 3;
      this.baseStepMesh.scale.set(stepSize / 46.5, 1, stepSize / 46.5);
    }

    if (this.terrainMesh) {
      const terrainSize = Math.max(320, agoraSize * 3.5);
      this.terrainMesh.scale.set(terrainSize / 240, terrainSize / 240, 1);
    }
  }

  private buildColonnades(group: THREE.Group) {
    const columnSpacing = 6;
    const halfWidth = 20;

    // Fluted Column Geometry Builder
    const createColumn = (height = 6.5, isRuined = false) => {
      const colGroup = new THREE.Group();

      // Plinth Base (Square + Torus)
      const baseBox = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.35, 1.3),
        this.materials['marble_stone']
      );
      baseBox.position.y = 0.175;
      baseBox.castShadow = true;
      baseBox.receiveShadow = true;
      colGroup.add(baseBox);

      const baseTorus = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.65, 0.25, 24),
        this.materials['marble_stone']
      );
      baseTorus.position.y = 0.45;
      baseTorus.castShadow = true;
      colGroup.add(baseTorus);

      // Fluted Shaft
      const actualHeight = isRuined ? height * (0.3 + Math.random() * 0.5) : height;
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.44, 0.52, actualHeight, 20),
        this.materials['marble_stone']
      );
      shaft.position.y = 0.55 + actualHeight / 2;
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      colGroup.add(shaft);

      // Capital (if not broken)
      if (!isRuined) {
        const capitalTorus = new THREE.Mesh(
          new THREE.CylinderGeometry(0.62, 0.45, 0.35, 24),
          this.materials['marble_stone']
        );
        capitalTorus.position.y = 0.55 + actualHeight + 0.15;
        capitalTorus.castShadow = true;
        colGroup.add(capitalTorus);

        const abacus = new THREE.Mesh(
          new THREE.BoxGeometry(1.25, 0.25, 1.25),
          this.materials['marble_stone']
        );
        abacus.position.y = 0.55 + actualHeight + 0.4;
        abacus.castShadow = true;
        colGroup.add(abacus);
      } else {
        // Fallen Drum segment next to it
        const fallenDrum = new THREE.Mesh(
          new THREE.CylinderGeometry(0.48, 0.48, 1.2, 16),
          this.materials['marble_stone']
        );
        fallenDrum.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        fallenDrum.position.set(0.9 + Math.random() * 0.4, 0.5, 0.4);
        fallenDrum.castShadow = true;
        colGroup.add(fallenDrum);
      }

      return colGroup;
    };

    // North Colonnade Line
    for (let x = -halfWidth; x <= halfWidth; x += columnSpacing) {
      if (Math.abs(x) < 2) continue; // Entrance opening
      const isRuined = (x === -12 || x === 18);
      const col = createColumn(6.2, isRuined);
      col.position.set(x, 0.3, -halfWidth);
      group.add(col);
    }

    // South Colonnade Line
    for (let x = -halfWidth; x <= halfWidth; x += columnSpacing) {
      if (Math.abs(x) < 4) continue; // Grand gate entrance
      const isRuined = (x === -6 || x === 12);
      const col = createColumn(6.2, isRuined);
      col.position.set(x, 0.3, halfWidth);
      group.add(col);
    }

    // Architraves (Connecting Beams on top of intact columns)
    const beamGeo = new THREE.BoxGeometry(columnSpacing + 0.6, 0.5, 1.1);
    // North Architrave sections
    [-15, -9, 9, 15].forEach(cx => {
      const beam = new THREE.Mesh(beamGeo, this.materials['marble_stone']);
      beam.position.set(cx, 7.45, -halfWidth);
      beam.castShadow = true;
      group.add(beam);
    });

    // Low perimeter stone walls enclosing the agora courtyard
    const wallGeo = new THREE.BoxGeometry(8, 0.9, 0.8);
    [-16, 16].forEach(z => {
      const leftWall = new THREE.Mesh(wallGeo, this.materials['weathered_rock']);
      leftWall.position.set(-halfWidth, 0.75, z);
      leftWall.rotation.y = Math.PI / 2;
      leftWall.castShadow = true;
      group.add(leftWall);

      const rightWall = new THREE.Mesh(wallGeo, this.materials['weathered_rock']);
      rightWall.position.set(halfWidth, 0.75, z);
      rightWall.rotation.y = Math.PI / 2;
      rightWall.castShadow = true;
      group.add(rightWall);
    });
  }

  private buildTempleRuins(group: THREE.Group) {
    // 1. North Sanctuary Pediment & Relic Wall
    const sanctuaryWallGeo = new THREE.BoxGeometry(16, 4.5, 1.2);
    const sanctuaryWall = new THREE.Mesh(sanctuaryWallGeo, this.materials['weathered_rock']);
    sanctuaryWall.position.set(0, 2.5, -24);
    sanctuaryWall.castShadow = true;
    sanctuaryWall.receiveShadow = true;
    group.add(sanctuaryWall);

    // Stepped Platform at the North Sanctuary
    for (let s = 0; s < 4; s++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(20 - s * 1.5, 0.3, 8 - s * 1.2),
        this.materials['marble_stone']
      );
      step.position.set(0, 0.15 + s * 0.3, -22 + s * 0.8);
      step.castShadow = true;
      step.receiveShadow = true;
      group.add(step);
    }

    // 2. West Relic Shrine (Altar of the Oracle)
    const altar = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 1.2, 3.5),
      this.materials['marble_stone']
    );
    altar.position.set(-22, 0.8, 0);
    altar.castShadow = true;
    altar.receiveShadow = true;
    group.add(altar);

    // Weathered Stone Amphora Urns on pedestals
    const createAmphora = (x: number, z: number) => {
      const amphoraGroup = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 16, 16),
        this.materials['weathered_rock']
      );
      body.scale.set(1, 1.5, 1);
      body.position.y = 0.7;
      body.castShadow = true;
      amphoraGroup.add(body);

      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.28, 0.4, 16),
        this.materials['weathered_rock']
      );
      neck.position.y = 1.4;
      amphoraGroup.add(neck);

      amphoraGroup.position.set(x, 0.3, z);
      return amphoraGroup;
    };

    group.add(createAmphora(-14, -14));
    group.add(createAmphora(14, -14));
    group.add(createAmphora(-14, 14));
    group.add(createAmphora(14, 14));
  }

  private buildFlora(group: THREE.Group) {
    // 1. Mediterranean Cypress Trees (Tall slender iconic landscape trees)
    const createCypress = (x: number, z: number, height = 9) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.28, height * 0.25, 8),
        this.materials['wood_trunk']
      );
      trunk.position.y = (height * 0.25) / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      // Conical foliage layers
      const layers = 5;
      for (let i = 0; i < layers; i++) {
        const layerHeight = height * (0.28 - i * 0.035);
        const radius = 1.3 - i * 0.22;
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(radius, layerHeight, 9),
          this.materials['cypress_foliage']
        );
        cone.position.y = height * 0.2 + i * (height * 0.16);
        cone.castShadow = true;
        cone.receiveShadow = true;
        tree.add(cone);
      }

      tree.position.set(x, 0, z);
      return tree;
    };

    // 2. Ancient Olive Trees (Gnarled trunk + round canopy)
    const createOliveTree = (x: number, z: number, scale = 1) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35 * scale, 0.55 * scale, 2.2 * scale, 8),
        this.materials['wood_trunk']
      );
      trunk.position.y = (2.2 * scale) / 2;
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;
      trunk.castShadow = true;
      tree.add(trunk);

      // 3 Foliage clumps
      [-0.6, 0, 0.7].forEach((ox, i) => {
        const clump = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.6 * scale, 1),
          this.materials['olive_foliage']
        );
        clump.position.set(ox * scale, (2.6 + (i % 2) * 0.4) * scale, (Math.random() - 0.5) * 0.5);
        clump.castShadow = true;
        clump.receiveShadow = true;
        tree.add(clump);
      });

      tree.position.set(x, 0, z);
      return tree;
    };

    // Plant Cypress groves framing the archaeological site
    const cypressLocations = [
      [-26, -26], [-28, -18], [-27, -10], [-29, 0], [-27, 12], [-28, 22], [-25, 27],
      [26, -26], [28, -18], [27, -10], [29, 0], [27, 12], [28, 22], [25, 27],
      [-12, -28], [12, -28], [-8, 28], [8, 28]
    ];
    cypressLocations.forEach(([x, z]) => {
      const h = 7.5 + Math.random() * 3.5;
      group.add(createCypress(x, z, h));
    });

    // Olive trees near entryways and ruins
    group.add(createOliveTree(-22, 16, 1.1));
    group.add(createOliveTree(22, 16, 1.2));
    group.add(createOliveTree(-22, -18, 0.95));
    group.add(createOliveTree(22, -18, 1.05));
  }

  private buildBraziers(group: THREE.Group): THREE.PointLight[] {
    const brazierLights: THREE.PointLight[] = [];
    const brazierPositions: [number, number, number][] = [
      [-16, 0.3, -16],
      [16, 0.3, -16],
      [-16, 0.3, 16],
      [16, 0.3, 16],
      [-5, 0.3, 20],
      [5, 0.3, 20],
    ];

    brazierPositions.forEach(([x, y, z]) => {
      const brazier = new THREE.Group();

      // Stone tripodal pedestal
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 0.3, 12),
        this.materials['weathered_rock']
      );
      base.position.y = 0.15;
      brazier.add(base);

      // Bronze bowl
      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.35, 0.45, 16, 1, true),
        this.materials['bronze']
      );
      bowl.position.y = 0.65;
      brazier.add(bowl);

      // Embers
      const embers = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 12, 8),
        this.materials['fire_glow']
      );
      embers.position.y = 0.72;
      brazier.add(embers);

      // Point Light with warm flame cast
      const light = new THREE.PointLight(0xff7722, 0.8, 14, 1.5);
      light.position.set(0, 1.2, 0);
      light.castShadow = false; // keep fast performance
      brazier.add(light);
      brazierLights.push(light);

      brazier.position.set(x, y, z);
      group.add(brazier);
    });

    return brazierLights;
  }

  private buildDustParticles(group: THREE.Group): THREE.Points {
    const particleCount = 450;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 8 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      scales[i] = Math.random() * 0.8 + 0.2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    // Particle Material
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 230, 180, 0.9)');
    grad.addColorStop(0.5, 'rgba(230, 190, 130, 0.4)');
    grad.addColorStop(1, 'rgba(200, 160, 100, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.25,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffeedd,
    });

    const particles = new THREE.Points(geometry, material);
    particles.name = 'DustMotes';
    group.add(particles);

    return particles;
  }
}
