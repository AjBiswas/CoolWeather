// @ts-nocheck
// ============================================================================
// DIGIT GEOMETRY
// ----------------------------------------------------------------------------
// Turns a character (digit, "-", "°", ...) into a real extruded 3D shape,
// built from the app's own Bebas Neue font file - not a lookalike font, the
// exact glyph outlines used everywhere else in the UI.
//
// Ported from the labs/3d-number/ prototype (see that folder for the
// step-by-step version with more commentary). The pipeline:
//   1. opentype.js reads the .ttf and returns the glyph outline as an SVG
//      path string.
//   2. Three's SVGLoader turns that path string into THREE.Shape objects -
//      routed through SVGLoader (rather than building the shape by hand)
//      specifically because it correctly figures out which sub-path is an
//      outer contour vs. a hole (e.g. "0"/"6"/"8"/"9" have an enclosed
//      counter) from winding direction, which we'd otherwise have to
//      reimplement ourselves.
//   3. THREE.ExtrudeGeometry pushes the flat shape into a beveled 3D block.
//
// Every geometry is cached by character (+ extrude options), since the same
// digit reappears constantly as the temperature changes.
// ============================================================================

import * as THREE from "three";
import * as opentype from "opentype.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

// Font units are arbitrary until scaled; 1000 keeps path coordinates in a
// friendly range. Callers scale the finished mesh down to world units.
const FONT_SIZE = 1000;

// BASE_URL respects vite.config.ts's `base: "./"` (needed so this still
// resolves correctly when the packaged app loads index.html via file://,
// where an absolute "/fonts/..." path would 404 against the filesystem root).
const FONT_URL = `${import.meta.env.BASE_URL}fonts/BebasNeue-Regular.ttf`;

let fontPromise = null;

function loadFont() {
  if (!fontPromise) {
    fontPromise = fetch(FONT_URL)
      .then((response) => response.arrayBuffer())
      .then((buffer) => opentype.parse(buffer));
  }
  return fontPromise;
}

const geometryCache = new Map();

/**
 * Extruded geometry for one character, plus the layout metrics
 * (`advance`/`minX`/`maxY`/etc, all in the same pre-scale world units as the
 * geometry itself) a caller needs to line several of these up on one
 * baseline - see buildTextGroup() below for that part.
 */
async function getCharacterGlyph(char, extrudeOptions) {
  const cacheKey = char + "|" + JSON.stringify(extrudeOptions);
  const cached = geometryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const font = await loadFont();
  const glyphPath = font.getPath(char, 0, 0, FONT_SIZE);
  const pathData = glyphPath.toPathData(3);

  const svgSource = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${pathData}"/></svg>`;
  const svgDocument = new SVGLoader().parse(svgSource);
  const shapePath = svgDocument.paths[0];
  const shapes = shapePath ? SVGLoader.createShapes(shapePath) : [];

  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: extrudeOptions.depth,
    bevelEnabled: true,
    bevelThickness: extrudeOptions.bevelThickness,
    bevelSize: extrudeOptions.bevelSize,
    bevelSegments: extrudeOptions.bevelSegments,
    curveSegments: extrudeOptions.curveSegments
  });

  // Font/SVG Y points down; Three.js world Y points up - flip once here so
  // every consumer downstream gets an already-upright geometry.
  geometry.scale(1, -1, 1);
  geometry.computeBoundingBox();

  // A blank glyph (e.g. a space) has an empty/invalid bounding box - fall
  // back to a zero-width box rather than propagating NaNs into layout math.
  const box = geometry.boundingBox;
  const isEmpty = !Number.isFinite(box.min.x) || !Number.isFinite(box.max.x);

  const glyph = {
    geometry,
    minX: isEmpty ? 0 : box.min.x,
    maxX: isEmpty ? 0 : box.max.x,
    minY: isEmpty ? 0 : box.min.y,
    maxY: isEmpty ? 0 : box.max.y
  };

  geometryCache.set(cacheKey, glyph);
  return glyph;
}

const DEFAULT_EXTRUDE_OPTIONS = {
  depth: 260,
  bevelThickness: 14,
  bevelSize: 10,
  bevelSegments: 3,
  curveSegments: 24
};

/**
 * Loads/builds glyphs for every character in `text` and returns them ready
 * to lay out on a single shared baseline: each glyph's own mesh-space origin
 * is its natural (font-metrics) position, so placing mesh[i] at
 * x = layout[i].x reproduces normal left-to-right typesetting - unlike
 * centering each glyph's own bounding box individually, which would throw
 * away the width/baseline relationships between characters.
 */
export async function layoutText(text, extrudeOptions = {}) {
  const options = { ...DEFAULT_EXTRUDE_OPTIONS, ...extrudeOptions };
  const characters = text.split("");
  const glyphs = await Promise.all(characters.map((char) => getCharacterGlyph(char, options)));

  let cursorX = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  const letters = glyphs.map((glyph, index) => {
    const x = cursorX - glyph.minX;
    cursorX += glyph.maxX - glyph.minX;
    // A little breathing room between glyphs so bevels don't touch.
    if (index < glyphs.length - 1) {
      cursorX += FONT_SIZE * 0.03;
    }
    minY = Math.min(minY, glyph.minY);
    maxY = Math.max(maxY, glyph.maxY);
    return { char: characters[index], geometry: glyph.geometry, x };
  });

  const totalWidth = cursorX;
  const totalHeight = Number.isFinite(maxY - minY) ? maxY - minY : 0;

  return {
    letters, // [{ char, geometry, x }] - x is pre-centering; see below
    totalWidth,
    totalHeight,
    centerX: totalWidth / 2,
    centerY: minY + totalHeight / 2
  };
}
