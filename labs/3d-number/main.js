// ============================================================================
// 3D NUMBER LAB
// ----------------------------------------------------------------------------
// Standalone preview of the temperature digit as it will actually render in
// the app - this imports the SAME src/lib/digitGeometry.ts pipeline
// WeatherScene.tsx uses, rather than a separate copy, specifically so that
// changes made there always show up here too. (An earlier version of this
// file had its own hardcoded copy of the extrude/font logic that drifted out
// of sync with the real app - if this file ever grows its own
// ExtrudeGeometry call again, that mistake is repeating.)
// ============================================================================

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { layoutText } from "../../src/lib/digitGeometry.ts";

// The text to build. Change this and reload to try different digits.
const TEXT = "5";

// Must match WeatherScene.tsx's NUMBER_SCALE so this preview is a true
// representation of the in-app size/proportions, not just the shape.
const NUMBER_SCALE = 0.00205;

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

  // --- Lighting: matches the number's own light rig in WeatherScene.tsx -
  // keep these two in sync by hand; there's no shared module for lighting
  // (only geometry is shared, via digitGeometry.ts) ---
  scene.add(new THREE.AmbientLight("#ffffff", 0.2));

  const keyLight = new THREE.DirectionalLight("#e8ecf5", 2.4);
  keyLight.position.set(0.3, 3.4, 1.6);
  scene.add(keyLight);

  // The signature red glow along the top edges in the reference. A point
  // light (not directional) so it falls off with distance and stays a
  // localized "rim" rather than washing the whole digit red.
  const rimLight = new THREE.PointLight("#ff2a1f", 10, 10, 2);
  rimLight.position.set(-0.3, 0.9, 1.6);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight("#6f8fff", 0.22);
  fillLight.position.set(-1.4, -0.2, 1.6);
  scene.add(fillLight);

  // --- Build the actual glyph(s) via the shared pipeline and drop them in ---
  const material = new THREE.MeshStandardMaterial({
    color: "#f4f5f8",
    roughness: 0.38,
    metalness: 0.06
  });

  const layout = await layoutText(TEXT);
  const group = new THREE.Group();
  layout.letters.forEach((letter) => {
    const mesh = new THREE.Mesh(letter.geometry, material);
    mesh.position.set(
      (letter.x - layout.centerX) * NUMBER_SCALE,
      -layout.centerY * NUMBER_SCALE,
      0
    );
    mesh.scale.setScalar(NUMBER_SCALE);
    group.add(mesh);
  });
  scene.add(group);

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
