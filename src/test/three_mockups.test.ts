import { describe, it, expect } from 'vitest';
import {
  ThreeRendererPool,
  evaluateOrbit360,
  evaluateIsometric,
  evaluateDollyIn,
  evaluateHover,
  evaluateCardFlip,
  calculateUVFitting,
  ThreeStage,
} from '../engine/three';
import { Mockup3DLayer } from '../types/scene';

describe('Scoped 3D Device Mockup Suite ("3D")', () => {
  describe('ThreeRendererPool', () => {
    it('enforces maximum active context limits with LRU eviction', () => {
      const pool = new ThreeRendererPool(3);
      const canvas1 = {} as HTMLCanvasElement;
      const canvas2 = {} as HTMLCanvasElement;
      const canvas3 = {} as HTMLCanvasElement;
      const canvas4 = {} as HTMLCanvasElement;

      pool.acquire('r1', canvas1);
      pool.acquire('r2', canvas2);
      pool.acquire('r3', canvas3);
      expect(pool.getActiveCount()).toBe(3);

      // Acquiring 4th evicts oldest (r1)
      pool.acquire('r4', canvas4);
      expect(pool.getActiveCount()).toBe(3);

      // Releasing r2 leaves 2
      pool.release('r2');
      expect(pool.getActiveCount()).toBe(2);
    });
  });

  describe('3D Camera Presets & Trajectories', () => {
    it('evaluateOrbit360 rotates 360 degrees smoothly across duration', () => {
      const start = evaluateOrbit360(0, 4.0, 0);
      expect(start.yaw).toBe(0);

      const mid = evaluateOrbit360(2.0, 4.0, 0);
      expect(mid.yaw).toBeCloseTo(180);
      expect(mid.pitch).toBeGreaterThan(0); // Bowing tilt

      const end = evaluateOrbit360(4.0, 4.0, 0);
      expect(end.yaw).toBeCloseTo(360);
    });

    it('evaluateIsometric provides telephoto perspective with 35.264° x 45° angles', () => {
      const iso = evaluateIsometric();
      expect(iso.rotation.pitch).toBeCloseTo(35.264, 2);
      expect(iso.rotation.yaw).toBe(45.0);
      expect(iso.camera.fov).toBe(22);
      expect(iso.camera.position[2]).toBe(11.5);
    });

    it('evaluateDollyIn pushes camera forward into the screen with snappy ease', () => {
      const start = evaluateDollyIn(0, 2.0, 6.5, 2.2);
      expect(start.camera.position[2]).toBe(6.5);
      expect(start.rotation.pitch).toBe(15);

      const end = evaluateDollyIn(2.0, 2.0, 6.5, 2.2);
      expect(end.camera.position[2]).toBeCloseTo(2.2);
      expect(end.rotation.pitch).toBeCloseTo(0); // Flattened to front
    });

    it('evaluateHover calculates non-commensurate anti-gravity floating wobble', () => {
      const h0 = evaluateHover(0, 0);
      const h1 = evaluateHover(1.0, 0);

      expect(h0.positionY).toBeCloseTo(0);
      expect(Math.abs(h1.positionY)).toBeGreaterThan(0);
      expect(h1.shadowScale).toBeGreaterThan(0);
      expect(h1.shadowOpacity).toBeGreaterThan(0);
    });

    it('evaluateCardFlip computes 180° flip with perspective recoil on Z-axis', () => {
      const start = evaluateCardFlip(0, 2.0);
      expect(start.yaw).toBe(0);
      expect(start.positionZ).toBe(0);
      expect(start.activeFace).toBe('front');

      // Midpoint: maximum negative Z recoil
      const mid = evaluateCardFlip(1.0, 2.0);
      expect(mid.positionZ).toBeLessThan(0); // Perspective pull back

      // End: settles at 180 degrees
      const end = evaluateCardFlip(2.0, 2.0);
      expect(end.yaw).toBeCloseTo(180, 0);
      expect(end.activeFace).toBe('back');
    });
  });

  describe('ScreenTextureProjector UV Fitting', () => {
    it('computes cover and contain scaling and offsets for 16:9 source on portrait 19.5:9 target', () => {
      const targetAspect = 1179 / 2556; // iPhone ~ 0.461
      const sourceW = 1920;
      const sourceH = 1080; // 16:9 ~ 1.777

      const coverFit = calculateUVFitting(sourceW, sourceH, targetAspect, 'cover');
      expect(coverFit.scaleU).toBeLessThan(1.0); // crops horizontal sides
      expect(coverFit.scaleV).toBe(1.0);

      const containFit = calculateUVFitting(sourceW, sourceH, targetAspect, 'contain');
      expect(containFit.scaleU).toBe(1.0);
      expect(containFit.scaleV).toBeLessThan(1.0); // pillarbox vertical
    });
  });

  describe('ThreeStage (Procedural Device Meshes & Stage Evaluation)', () => {
    it('creates and mounts iPhone, MacBook, and Card procedural models', () => {
      const stage = new ThreeStage(1920, 1080);
      expect(stage.currentModelType).toBe('iphone');
      expect(stage.screenMesh).toBeDefined();

      stage.setModelType('macbook');
      expect(stage.currentModelType).toBe('macbook');
      expect(stage.screenMesh).toBeDefined();

      stage.setModelType('card');
      expect(stage.currentModelType).toBe('card');
      expect(stage.screenMesh).toBeDefined();
    });

    it('evaluates stage transforms at timestamp t for camera presets', () => {
      const stage = new ThreeStage(1920, 1080);
      const layer: Mockup3DLayer = {
        id: 'mockup_1',
        name: 'iPhone Showcase',
        type: 'mockup3d',
        modelType: 'iphone',
        position3D: [0, 0, 0],
        rotation3D: [0, 0, 0],
        cameraFov: 45,
        cameraPosition: [0, 0, 5],
        cameraTarget: [0, 0, 0],
        cameraPreset: 'orbit360',
        style: { x: 0, y: 0, width: 1920, height: 1080, rotation: 0, opacity: 1 },
      };

      stage.evaluateAtTime(2.0, layer, 4.0);
      expect(stage.currentModel).toBeDefined();
      expect(stage.currentModel?.rotation.y).toBeCloseTo(Math.PI, 1); // 180 deg in radians
    });
  });
});
