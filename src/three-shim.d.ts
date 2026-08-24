declare module "three";

declare module "three/examples/jsm/geometries/TextGeometry.js" {
  export interface TextGeometryParameters {
    font: unknown;
    size?: number;
    depth?: number;
    curveSegments?: number;
    bevelEnabled?: boolean;
    bevelThickness?: number;
    bevelSize?: number;
    bevelOffset?: number;
    bevelSegments?: number;
  }

  export class TextGeometry {
    boundingBox:
      | {
          min: { x: number; y: number; z: number };
          max: { x: number; y: number; z: number };
        }
      | null;
    constructor(text: string, parameters: TextGeometryParameters);
    computeBoundingBox(): void;
    computeVertexNormals(): void;
    translate(x: number, y: number, z: number): this;
    clone(): TextGeometry;
    dispose(): void;
  }
}

declare module "three/examples/jsm/loaders/FontLoader.js" {
  export class FontLoader {
    parse(json: unknown): Font;
  }

  export interface Font {
    data: unknown;
    generateShapes(text: string, size: number): unknown[];
  }
}
