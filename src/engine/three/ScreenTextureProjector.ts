/**
 * Screen Texture Projector & OLED Display Material Generator
 * Calculates UV coordinate projections (cover, contain, stretch) and
 * generates OLED PBR materials with emissive self-illumination and clearcoat glints.
 */

import * as THREE from 'three';

export type ScreenFitMode = 'cover' | 'contain' | 'stretch';

export interface UVFittingTransform {
  scaleU: number;
  scaleV: number;
  offsetU: number;
  offsetV: number;
}

/**
 * Calculates texture repeat and offset for UV projection mapping.
 */
export function calculateUVFitting(
  sourceWidth: number,
  sourceHeight: number,
  targetAspect: number,
  fitMode: ScreenFitMode = 'cover'
): UVFittingTransform {
  const sw = Math.max(1, sourceWidth);
  const sh = Math.max(1, sourceHeight);
  const sourceAspect = sw / sh;

  if (fitMode === 'stretch') {
    return { scaleU: 1, scaleV: 1, offsetU: 0, offsetV: 0 };
  }

  let scaleU = 1;
  let scaleV = 1;
  let offsetU = 0;
  let offsetV = 0;

  if (fitMode === 'cover') {
    if (sourceAspect > targetAspect) {
      scaleU = targetAspect / sourceAspect;
      offsetU = (1 - scaleU) / 2;
    } else {
      scaleV = sourceAspect / targetAspect;
      offsetV = (1 - scaleV) / 2;
    }
  } else if (fitMode === 'contain') {
    if (sourceAspect > targetAspect) {
      scaleV = targetAspect / sourceAspect;
      offsetV = (1 - scaleV) / 2;
    } else {
      scaleU = sourceAspect / targetAspect;
      offsetU = (1 - scaleU) / 2;
    }
  }

  return { scaleU, scaleV, offsetU, offsetV };
}

/**
 * Applies calculated UV transforms to a Three.js texture.
 */
export function applyTextureUVFitting(
  texture: THREE.Texture,
  sourceWidth: number,
  sourceHeight: number,
  targetAspect: number,
  fitMode: ScreenFitMode = 'cover'
): void {
  const { scaleU, scaleV, offsetU, offsetV } = calculateUVFitting(
    sourceWidth,
    sourceHeight,
    targetAspect,
    fitMode
  );

  texture.repeat.set(scaleU, scaleV);
  texture.offset.set(offsetU, offsetV);
  texture.needsUpdate = true;
}

/**
 * Creates a high-fidelity OLED physical screen material.
 */
export function createOLEDDisplayMaterial(
  screenTexture: THREE.Texture,
  emissiveIntensity = 0.85
): THREE.MeshPhysicalMaterial {
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.minFilter = THREE.LinearFilter;
  screenTexture.magFilter = THREE.LinearFilter;
  screenTexture.generateMipmaps = false;

  return new THREE.MeshPhysicalMaterial({
    map: screenTexture,
    emissiveMap: screenTexture,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity,
    roughness: 0.04,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.5,
    toneMapped: true,
  });
}
