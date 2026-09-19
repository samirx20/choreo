/**
 * ThreeStage: Procedural 3D Device Mockup Stage & Offscreen Render Engine
 * Generates high-fidelity tech hardware models (iPhone, MacBook, Smart Card)
 * with studio 3-point lighting, dynamic contact shadows, and OLED screen projection.
 */

import * as THREE from 'three';
import {
  Mockup3DLayer,
  MockupModelType,
} from '@/types/scene';
import {
  evaluateOrbit360,
  evaluateIsometric,
  evaluateDollyIn,
  evaluateHover,
  evaluateCardFlip,
} from './ThreeCameraPresets';
import { createOLEDDisplayMaterial, applyTextureUVFitting } from './ScreenTextureProjector';

export class ThreeStage {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly keyLight: THREE.DirectionalLight;
  public readonly fillLight: THREE.DirectionalLight;
  public readonly rimLight: THREE.DirectionalLight;
  public readonly shadowPlane: THREE.Mesh;
  public currentModel: THREE.Group | null = null;
  public screenMesh: THREE.Mesh | null = null;
  public currentModelType: MockupModelType = 'iphone';

  constructor(public width = 1920, public height = 1080) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    // 1. Studio 3-Point Lighting Rig
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.keyLight.position.set(3, 5, 4);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xdbeafe, 0.35); // subtle cool fill
    this.fillLight.position.set(-4, 1, 2);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xfef08a, 2.0); // warm titanium rim
    this.rimLight.position.set(0, 4, -4);
    this.scene.add(this.rimLight);

    // Ambient fill
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // 2. Damped Ground Contact Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(6, 6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
    });
    this.shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = -1.8;
    this.scene.add(this.shadowPlane);

    // Initialize default model
    this.setModelType('iphone');
  }

  /**
   * Builds and mounts procedural device meshes (iPhone, MacBook, Card)
   */
  public setModelType(type: MockupModelType): void {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
      this.screenMesh = null;
    }

    this.currentModelType = type;
    const group = new THREE.Group();

    if (type === 'iphone') {
      // iPhone 16 Pro mockup geometry
      // 1. Chassis
      const bodyGeo = new THREE.BoxGeometry(2.1, 4.3, 0.2);
      const titaniumMat = new THREE.MeshStandardMaterial({
        color: 0x27272a, // Natural titanium zinc-800
        metalness: 0.85,
        roughness: 0.25,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, titaniumMat);
      group.add(bodyMesh);

      // 2. Screen surface (front face at z = 0.105)
      const screenGeo = new THREE.PlaneGeometry(1.95, 4.15);
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.z = 0.105;
      group.add(screen);
      this.screenMesh = screen;

      // 3. Camera Island
      const camBumpGeo = new THREE.BoxGeometry(0.85, 0.95, 0.08);
      const bumpMesh = new THREE.Mesh(camBumpGeo, titaniumMat);
      bumpMesh.position.set(-0.45, 1.45, -0.12);
      group.add(bumpMesh);
    } else if (type === 'macbook') {
      // MacBook Pro mockup geometry
      // 1. Base unibody
      const baseGeo = new THREE.BoxGeometry(4.2, 0.12, 2.8);
      const alumMat = new THREE.MeshStandardMaterial({
        color: 0x3f3f46,
        metalness: 0.7,
        roughness: 0.3,
      });
      const baseMesh = new THREE.Mesh(baseGeo, alumMat);
      baseMesh.position.set(0, -0.6, 0);
      group.add(baseMesh);

      // 2. Screen lid angled at 105 degrees
      const lidGroup = new THREE.Group();
      lidGroup.position.set(0, -0.54, -1.35);

      const lidGeo = new THREE.BoxGeometry(4.2, 2.7, 0.08);
      const lidMesh = new THREE.Mesh(lidGeo, alumMat);
      lidMesh.position.set(0, 1.35, 0);
      lidGroup.add(lidMesh);

      const screenGeo = new THREE.PlaneGeometry(4.0, 2.5);
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 1.35, 0.045);
      lidGroup.add(screen);
      this.screenMesh = screen;

      lidGroup.rotation.x = THREE.MathUtils.degToRad(-15); // open angle
      group.add(lidGroup);
    } else {
      // Card / Badge geometry
      const cardGeo = new THREE.BoxGeometry(3.2, 2.0, 0.04);
      const cardMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        metalness: 0.3,
        roughness: 0.4,
      });
      const cardMesh = new THREE.Mesh(cardGeo, cardMat);
      group.add(cardMesh);

      const faceGeo = new THREE.PlaneGeometry(3.1, 1.9);
      const faceMat = new THREE.MeshBasicMaterial({ color: 0x27272a });
      const face = new THREE.Mesh(faceGeo, faceMat);
      face.position.z = 0.025;
      group.add(face);
      this.screenMesh = face;
    }

    this.currentModel = group;
    this.scene.add(group);
  }

  /**
   * Projects a texture onto the active screen mesh.
   */
  public projectScreenTexture(texture: THREE.Texture, fitMode: 'cover' | 'contain' | 'stretch' = 'cover'): void {
    if (!this.screenMesh) return;
    const imgW = (texture.image as any)?.width || 1080;
    const imgH = (texture.image as any)?.height || 1920;
    applyTextureUVFitting(texture, imgW, imgH, 19.5 / 9, fitMode);
    this.screenMesh.material = createOLEDDisplayMaterial(texture);
  }

  /**
   * Evaluates camera and device transforms at timestamp t based on preset or explicit keyframes.
   */
  public evaluateAtTime(t: number, layer: Mockup3DLayer, duration = 5.0): void {
    if (!this.currentModel) return;

    const preset = layer.cameraPreset;

    if (preset === 'orbit360') {
      const rot = evaluateOrbit360(t, duration);
      this.currentModel.rotation.set(
        THREE.MathUtils.degToRad(rot.pitch),
        THREE.MathUtils.degToRad(rot.yaw),
        THREE.MathUtils.degToRad(rot.roll)
      );
    } else if (preset === 'isometric') {
      const iso = evaluateIsometric();
      this.currentModel.rotation.set(
        THREE.MathUtils.degToRad(iso.rotation.pitch),
        THREE.MathUtils.degToRad(iso.rotation.yaw),
        THREE.MathUtils.degToRad(iso.rotation.roll)
      );
      this.camera.position.set(...iso.camera.position);
      this.camera.fov = iso.camera.fov;
      this.camera.updateProjectionMatrix();
    } else if (preset === 'dollyIn') {
      const dolly = evaluateDollyIn(t, duration);
      this.camera.position.set(...dolly.camera.position);
      this.camera.lookAt(...dolly.camera.target);
      this.camera.updateProjectionMatrix();
      this.currentModel.rotation.set(
        THREE.MathUtils.degToRad(dolly.rotation.pitch),
        THREE.MathUtils.degToRad(dolly.rotation.yaw),
        THREE.MathUtils.degToRad(dolly.rotation.roll)
      );
    } else if (preset === 'hover') {
      const hover = evaluateHover(t, layer.position3D?.[1] ?? 0);
      this.currentModel.position.y = hover.positionY;
      this.currentModel.rotation.set(
        THREE.MathUtils.degToRad(hover.pitch),
        THREE.MathUtils.degToRad(hover.yaw),
        THREE.MathUtils.degToRad(hover.roll)
      );
      this.shadowPlane.scale.setScalar(hover.shadowScale);
      (this.shadowPlane.material as THREE.MeshBasicMaterial).opacity = hover.shadowOpacity;
    } else if (preset === 'cardFlip') {
      const flip = evaluateCardFlip(t, duration);
      this.currentModel.rotation.set(
        THREE.MathUtils.degToRad(flip.pitch),
        THREE.MathUtils.degToRad(flip.yaw),
        THREE.MathUtils.degToRad(flip.roll)
      );
      this.currentModel.position.z = flip.positionZ;
    } else {
      // Explicit or default coordinates
      const pos = layer.position3D || [0, 0, 0];
      const rot = layer.rotation3D || [0, 0, 0];
      const scale = layer.scale3D || [1, 1, 1];

      this.currentModel.position.set(...pos);
      this.currentModel.rotation.set(
        THREE.MathUtils.degToRad(rot[0]),
        THREE.MathUtils.degToRad(rot[1]),
        THREE.MathUtils.degToRad(rot[2])
      );
      this.currentModel.scale.set(...scale);

      if (layer.cameraPosition) this.camera.position.set(...layer.cameraPosition);
      if (layer.cameraTarget) this.camera.lookAt(...layer.cameraTarget);
      if (layer.cameraFov) {
        this.camera.fov = layer.cameraFov;
        this.camera.updateProjectionMatrix();
      }
    }
  }
}
