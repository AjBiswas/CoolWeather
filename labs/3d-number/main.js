// ============================================================================
// 3D NUMBER LAB
// ----------------------------------------------------------------------------
// Standalone prototype (lives outside src/, doesn't touch the real app) whose
// only job is to answer one question: "can we build the reference '5' photo
// as a real extruded 3D object instead of the 2D-canvas fake-3D the app uses
// today?" If this looks right, the same pipeline gets ported into
// TemperatureNumber.tsx later.
//
// THE HARD PART, upfront: Three.js has no "type this digit in 3D" API. To get
// a shape you can extrude, you need the digit's outline as a vector path. The
// pipeline below gets that path from the *actual* Bebas Neue font file (the
// same font the app already uses), so the 3D "5" is the same "5" you already
// see everywhere else in the UI - not a lookalike.
//
// Pipeline, in order:
//   1. opentype.js reads the .ttf and hands back the glyph's outline as an
//      SVG path string (moveto/lineto/curve commands).
//   2. Three's SVGLoader turns that path string into THREE.Shape objects -
//      this step is why we go via SVGLoader instead of building the shape by
//      hand: it correctly figures out which sub-path is an outer contour and
//      which is a hole (e.g. "0"/"6"/"8"/"9" have an enclosed counter) using
//      winding-direction math we'd otherwise have to reimplement ourselves.
//   3. THREE.ExtrudeGeometry pushes that flat shape into 3D and bevels the
//      edges.
//   4. A small light rig (dark charcoal material + a red rim light from
//      above) reproduces the reference photo's look.
// ============================================================================

import * as THREE from "three";
// opentype.js has no default export - just the named ones (parse, Font, ...).
import * as opentype from "opentype.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// The character to build. Change this and reload to try a different digit -
// the whole pipeline below is generic, not hardcoded to "5".
const CHARACTER = "5";

// Font units are arbitrary until you pick a size; 1000 keeps the resulting
// path coordinates in a friendly range (roughly -500..+1500) before we
// re-scale the finished geometry down to Three.js world units.
const FONT_SIZE = 1000;

// ----------------------------------------------------------------------------
// STEP 1 - load the font and pull the glyph's outline out of it.
// ----------------------------------------------------------------------------
async function loadGlyphSvgPath(character) {
  const response = await fetch("./fonts/BebasNeue-Regular.ttf");
  const buffer = await response.arrayBuffer();
  const font = opentype.parse(buffer);

  // getPath() lays the glyph out at (x=0, y=0) and returns an opentype.Path -
  // toPathData() turns that into the same "M.. L.. C.. Z.." string an SVG
  // <path d="..."> attribute would use, which is the hand-off format to
  // Three's SVGLoader below.
  const path = font.getPath(character, 0, 0, FONT_SIZE);
  return path.toPathData(3);
}

// ----------------------------------------------------------------------------
// STEP 2 - turn that SVG path string into extrudable THREE.Shape objects.
// ----------------------------------------------------------------------------
function svgPathToShapes(pathData) {
  // SVGLoader normally parses a whole <svg> document; we hand it the
  // smallest possible one that contains just our single glyph path.
  const svgSource = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${pathData}"/></svg>`;
  const svgDocument = new SVGLoader().parse(svgSource);
  const glyphPath = svgDocument.paths[0];

  // This static method is the reason we route through SVGLoader at all: it
  // looks at each sub-path's winding direction to decide outer-contour vs
  // hole, and returns Shapes with .holes already populated correctly.
  return SVGLoader.createShapes(glyphPath);
}

// ----------------------------------------------------------------------------
// STEP 3 - extrude the flat glyph shape into a beveled 3D block.
// ----------------------------------------------------------------------------
function buildDigitMesh(shapes) {
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: 260, // how thick the block is, in font units (see FONT_SIZE above)
    bevelEnabled: true,
    bevelThickness: 14, // sharp-ish bevel, not a rounded/soft edge
    bevelSize: 10,
    bevelSegments: 3,
    curveSegments: 24 // smoothness of the font's curved strokes
  });

  // Two fixes every font->3D pipeline needs:
  //  - SVG/font Y axis points down; Three.js world Y points up. Flip it, or
  //    the glyph renders upside down.
  //  - Center the geometry on its own bounding box so the mesh's origin (and
  //    therefore rotation/orbit pivot) is the middle of the glyph, not some
  //    arbitrary point dictated by the font's internal coordinate space.
  geometry.scale(1, -1, 1);
  geometry.center();

  // White body (swap this one line for the reference's dark-charcoal look:
  // color "#2c2c32"). Metalness is kept very low on purpose either way: a
  // metallic surface has almost no diffuse reflectance, so without a
  // reflection/environment map (we don't have one here) it only lights up in
  // tiny specular hotspots and looks pitch black everywhere else.
  const material = new THREE.MeshStandardMaterial({
    color: "#f4f5f8",
    roughness: 0.38, // low-ish: gives a clear glossy highlight, not flat diffuse
    metalness: 0.06
  });

  const mesh = new THREE.Mesh(geometry, material);

  // Font units are large (FONT_SIZE = 1000); shrink into a comfortable
  // on-screen size relative to the rest of the scene.
  mesh.scale.setScalar(0.0026);
  return mesh;
}

// ----------------------------------------------------------------------------
// STEP 4 - scene, lights, camera, render loop.
// ----------------------------------------------------------------------------
async function main() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#050505");

  const camera = new THREE.PerspectiveCamera(
    32,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0.15, 0.05, 5.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lets you drag-rotate / scroll-zoom to inspect the model from any angle -
  // handy for a review prototype even though the real app won't ship this.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  // --- Lighting: this is what actually sells the reference photo's look ---
  // A white body reflects far more light than the dark-charcoal version did
  // (diffuse brightness = albedo x light intensity), so every intensity here
  // is noticeably lower than you'd use for a dark material - the same
  // absolute light level that made near-black charcoal readable would blow a
  // white surface out to flat, shadowless white and erase the rim-light
  // contrast. If you switch the material color back to dark, scale these
  // back up too (roughly: ambient 0.65, key 2.6 worked well for #2c2c32).
  scene.add(new THREE.AmbientLight("#ffffff", 0.38));

  // Broad, soft key light from the camera side - this is what actually
  // reveals the material's shape/roughness across the front face. Without
  // this the digit is only legible where the red rim or blue fill happens to
  // catch an edge.
  const keyLight = new THREE.DirectionalLight("#e8ecf5", 1.3);
  keyLight.position.set(1.2, 1.0, 3.5);
  scene.add(keyLight);

  // The signature red glow along the top edges in the reference. A point
  // light (not directional) so it falls off with distance and stays a
  // localized "rim" rather than washing the whole digit red.
  const rimLight = new THREE.PointLight("#ff2a1f", 18, 12, 2);
  rimLight.position.set(-0.4, 2.2, 1.6);
  scene.add(rimLight);

  // Cool, dim fill from the front-left so shadowed faces still separate from
  // pure black instead of disappearing entirely.
  const fillLight = new THREE.DirectionalLight("#6f8fff", 0.35);
  fillLight.position.set(-2, 0.5, 2);
  scene.add(fillLight);

  // Soft light from below-front - the reference's bottom edge and inner
  // curve of the "5" are still faintly visible rather than falling to black.
  const bounceLight = new THREE.DirectionalLight("#3a3a40", 0.4);
  bounceLight.position.set(0.5, -1.5, 2);
  scene.add(bounceLight);

  // --- Build the actual glyph and drop it in ---
  const pathData = await loadGlyphSvgPath(CHARACTER);
  const shapes = svgPathToShapes(pathData);
  const digit = buildDigitMesh(shapes);
  scene.add(digit);

  // --- Render loop ---
  function renderFrame() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(renderFrame);
  }
  renderFrame();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

main().catch((error) => {
  console.error("3D number lab failed to start:", error);
});
