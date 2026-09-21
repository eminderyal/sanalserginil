import * as THREE from 'three';
import { Exhibit, DisplayFrameStyle } from '../types';

export class PlinthBuilder {
  private textureLoader = new THREE.TextureLoader();
  private loadedTextures: Map<string, THREE.Texture> = new Map();
  private defaultTexture: THREE.Texture;

  constructor() {
    // Generate fallback archaeological canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2c221a';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('ANCIENT RELIC', 256, 240);
    ctx.fillStyle = '#a89078';
    ctx.font = '22px sans-serif';
    ctx.fillText('Archaeological Artifact', 256, 290);
    this.defaultTexture = new THREE.CanvasTexture(canvas);
  }

  public createPlinth(
    exhibit: Exhibit,
    onPointerOver?: () => void,
    onPointerOut?: () => void
  ): { group: THREE.Group; interactiveMesh: THREE.Mesh; spotlight: THREE.SpotLight; beacon: THREE.Mesh } {
    const group = new THREE.Group();
    group.name = `Exhibit_${exhibit.id}`;
    group.userData = { exhibitId: exhibit.id, exhibit };

    const style: DisplayFrameStyle = exhibit.frameStyle || 'stone_pedestal';

    // 1. Stand / Plinth Base Geometry based on style
    let pedestalMesh: THREE.Mesh;
    let frameMesh: THREE.Mesh;
    let glassVitrineMesh: THREE.Mesh | null = null;

    if (style === 'stone_pedestal') {
      // Classical Carved Marble Pedestal
      const pedestalGeo = new THREE.CylinderGeometry(1.0, 1.25, 1.5, 24);
      const pedestalMat = new THREE.MeshStandardMaterial({
        color: 0xdfd7ca,
        roughness: 0.6,
        metalness: 0.1,
      });
      pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestalMesh.position.y = 0.75;
      pedestalMesh.castShadow = true;
      pedestalMesh.receiveShadow = true;
      group.add(pedestalMesh);

      // Capital moulding on pedestal
      const capMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 0.22, 1.4),
        new THREE.MeshStandardMaterial({ color: 0xede6da, roughness: 0.5 })
      );
      capMesh.position.y = 1.6;
      capMesh.castShadow = true;
      group.add(capMesh);

      // Frame around picture
      const frameGeo = new THREE.BoxGeometry(2.1, 2.7, 0.14);
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x82643f,
        roughness: 0.4,
        metalness: 0.6,
      });
      frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.position.y = 3.05;
      frameMesh.castShadow = true;
      group.add(frameMesh);
    } else if (style === 'glass_vitrine') {
      // Modern Glass & Brass Vitrine
      const plinthBase = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.9, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.3, metalness: 0.7 })
      );
      plinthBase.position.y = 0.45;
      plinthBase.castShadow = true;
      plinthBase.receiveShadow = true;
      group.add(plinthBase);

      // Glass Cover
      const glassGeo = new THREE.BoxGeometry(2.3, 2.9, 1.4);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.85,
        ior: 1.5,
        reflectivity: 0.6,
      });
      glassVitrineMesh = new THREE.Mesh(glassGeo, glassMat);
      glassVitrineMesh.position.y = 2.4;
      group.add(glassVitrineMesh);

      // Brass Corner Struts
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.25 });
      frameMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.5, 0.08), frameMat);
      frameMesh.position.y = 2.4;
      group.add(frameMesh);
    } else if (style === 'bronze_stela') {
      // Ancient Bronze Monument Stela
      const stelaGeo = new THREE.BoxGeometry(2.2, 4.0, 0.45);
      const stelaMat = new THREE.MeshStandardMaterial({
        color: 0x544332,
        roughness: 0.5,
        metalness: 0.85,
      });
      pedestalMesh = new THREE.Mesh(stelaGeo, stelaMat);
      pedestalMesh.position.y = 2.0;
      pedestalMesh.castShadow = true;
      pedestalMesh.receiveShadow = true;
      group.add(pedestalMesh);

      const frameMat = new THREE.MeshStandardMaterial({ color: 0xa87d3e, metalness: 0.7, roughness: 0.35 });
      frameMesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.5, 0.08), frameMat);
      frameMesh.position.set(0, 2.5, 0.24);
      group.add(frameMesh);
    } else {
      // obsidian_monolith
      const monolithGeo = new THREE.BoxGeometry(2.3, 4.2, 0.8);
      const monolithMat = new THREE.MeshStandardMaterial({
        color: 0x18181c,
        roughness: 0.2,
        metalness: 0.9,
      });
      pedestalMesh = new THREE.Mesh(monolithGeo, monolithMat);
      pedestalMesh.position.y = 2.1;
      pedestalMesh.castShadow = true;
      pedestalMesh.receiveShadow = true;
      group.add(pedestalMesh);

      // Gold Trim
      const goldTrim = new THREE.Mesh(
        new THREE.BoxGeometry(2.36, 4.24, 0.76),
        new THREE.MeshStandardMaterial({ color: 0xf3c054, roughness: 0.3, metalness: 0.95 })
      );
      goldTrim.position.y = 2.1;
      group.add(goldTrim);

      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f0f12, metalness: 0.5, roughness: 0.4 });
      frameMesh = new THREE.Mesh(new THREE.BoxGeometry(1.95, 2.6, 0.06), frameMat);
      frameMesh.position.set(0, 2.5, 0.42);
      group.add(frameMesh);
    }

    // 2. Picture Display Canvas / Texture Surface
    const imageWidth = 1.75;
    const imageHeight = 2.25;
    const canvasGeo = new THREE.PlaneGeometry(imageWidth, imageHeight);

    const canvasMat = new THREE.MeshStandardMaterial({
      map: this.defaultTexture,
      roughness: 0.4,
      metalness: 0.05,
      side: THREE.FrontSide,
    });

    // Load actual image texture
    if (exhibit.imageUrl) {
      if (this.loadedTextures.has(exhibit.imageUrl)) {
        canvasMat.map = this.loadedTextures.get(exhibit.imageUrl)!;
        canvasMat.needsUpdate = true;
      } else {
        this.textureLoader.load(
          exhibit.imageUrl,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.generateMipmaps = true;
            this.loadedTextures.set(exhibit.imageUrl, tex);
            canvasMat.map = tex;
            canvasMat.needsUpdate = true;
          },
          undefined,
          () => {
            // keep fallback
          }
        );
      }
    }

    const pictureMesh = new THREE.Mesh(canvasGeo, canvasMat);
    if (style === 'stone_pedestal') {
      pictureMesh.position.set(0, 3.05, 0.08);
    } else if (style === 'glass_vitrine') {
      pictureMesh.position.set(0, 2.4, 0.05);
    } else if (style === 'bronze_stela') {
      pictureMesh.position.set(0, 2.5, 0.29);
    } else {
      pictureMesh.position.set(0, 2.5, 0.46);
    }
    pictureMesh.castShadow = true;
    group.add(pictureMesh);

    // 3. Interactive Clickable Hitbox (Slightly larger bounding volume for effortless raycasting)
    const hitGeo = new THREE.BoxGeometry(2.6, 3.6, 1.8);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const interactiveMesh = new THREE.Mesh(hitGeo, hitMat);
    interactiveMesh.position.set(0, 2.4, 0);
    interactiveMesh.userData = { exhibitId: exhibit.id, exhibit, parentGroup: group };
    group.add(interactiveMesh);

    // 4. Engraved Brass Title Plaque
    const plaqueCanvas = document.createElement('canvas');
    plaqueCanvas.width = 512;
    plaqueCanvas.height = 128;
    const pctx = plaqueCanvas.getContext('2d')!;
    pctx.fillStyle = '#b8924b';
    pctx.fillRect(0, 0, 512, 128);
    pctx.strokeStyle = '#5a3d1b';
    pctx.lineWidth = 6;
    pctx.strokeRect(6, 6, 500, 116);
    pctx.fillStyle = '#1c130c';
    pctx.font = 'bold 30px serif';
    pctx.textAlign = 'center';
    pctx.fillText(exhibit.title.substring(0, 26), 256, 55);
    pctx.font = 'italic 20px sans-serif';
    pctx.fillText(exhibit.era.substring(0, 34), 256, 95);

    const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
    const plaqueMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.35),
      new THREE.MeshStandardMaterial({
        map: plaqueTex,
        roughness: 0.3,
        metalness: 0.7,
      })
    );

    if (style === 'stone_pedestal') {
      plaqueMesh.position.set(0, 1.6, 0.71);
    } else if (style === 'glass_vitrine') {
      plaqueMesh.position.set(0, 0.5, 0.76);
    } else if (style === 'bronze_stela') {
      plaqueMesh.position.set(0, 0.85, 0.24);
    } else {
      plaqueMesh.position.set(0, 0.85, 0.42);
    }
    group.add(plaqueMesh);

    // 5. Overhead Focused Museum Spotlight
    const spotlight = new THREE.SpotLight(0xfff3d6, 2.4, 8, Math.PI / 5, 0.4, 1.2);
    spotlight.position.set(0, 4.8, 1.4);
    spotlight.target = pictureMesh;
    spotlight.castShadow = false;
    group.add(spotlight);
    group.add(spotlight.target);

    // 6. Glowing Ground Inspection Beacon
    const beaconGeo = new THREE.RingGeometry(1.2, 1.45, 32);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(exhibit.highlightColor || '#d4af37'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.rotation.x = -Math.PI / 2;
    beacon.position.set(0, 0.38, 0.8);
    beacon.name = `Beacon_${exhibit.id}`;
    group.add(beacon);

    // Set 3D World Transform
    group.position.set(exhibit.position[0], exhibit.position[1], exhibit.position[2]);
    if (exhibit.rotationY !== undefined) {
      group.rotation.y = exhibit.rotationY;
    }
    if (exhibit.scale) {
      group.scale.set(exhibit.scale, exhibit.scale, exhibit.scale);
    }

    return { group, interactiveMesh, spotlight, beacon };
  }
}
