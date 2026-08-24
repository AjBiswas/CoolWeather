// @ts-nocheck
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import type { WeatherCondition } from "../types";
import { layoutText } from "../lib/digitGeometry";

interface WeatherSceneProps {
  condition: WeatherCondition;
  isNight?: boolean;
  /** The temperature digits to render as real 3D geometry, e.g. "31" or "--". */
  numberText: string;
}

type ThemeKey =
  | WeatherCondition
  | "clear-night"
  | "partly-cloudy-night"
  | "cloudy-night"
  | "rainy-night"
  | "haze-night"
  | "snow-night"
  | "night";

interface SceneTheme {
  cloudColor: string;
  rainColor: string;
  orbColor: string;
  showRain: boolean;
  showLightning: boolean;
  showStars: boolean;
  orbOpacity: number;
  cloudOpacity: number;
  orbScale: number;
  showGlow: boolean;
  backgroundColor: string;
  ambientIntensity: number;
  keyColor: string;
  keyIntensity: number;
  fillColor: string;
  fillIntensity: number;
  bounceIntensity: number;
  cloudCount: number;
  lightningStrikeChance?: number;
  lightningCooldown?: [number, number];
}

interface CloudMotion {
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  baseColor: THREE.Color;
  highlightMesh: THREE.Mesh;
  highlightMaterial: THREE.MeshBasicMaterial;
  baseX: number;
  baseY: number;
  baseZ: number;
  driftSpeed: number;
  driftSpan: number;
  bobAmp: number;
  bobSpeed: number;
  bobPhase: number;
  swayAmp: number;
  swaySpeed: number;
  swayPhase: number;
  rollAmp: number;
  rollSpeed: number;
  scalePulseAmp: number;
  scalePulseSpeed: number;
  scalePulsePhase: number;
  highlightPhase: number;
  initialScale: THREE.Vector3;
}

interface StarMotion {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  baseScale: number;
  twinkleSpeed: number;
  twinklePhase: number;
  pulseDepth: number;
}

interface RainMotion {
  mesh: THREE.Mesh;
  anchor: CloudMotion;
  fallSpeed: number;
  length: number;
  lateralOffset: number;
  depthOffset: number;
  resetOffset: number;
}

interface BirdMotion {
  group: THREE.Group;
  wingLeft: THREE.Mesh;
  wingRight: THREE.Mesh;
  speed: number;
  bobAmp: number;
  bobSpeed: number;
  phase: number;
  wingSpeed: number;
  wingAmp: number;
  startX: number;
  travel: number;
  baseY: number;
  baseZ: number;
}

const sceneThemes: Record<
  ThemeKey,
  SceneTheme
> = {
  clear: {
     cloudColor: "#eaeef5",
    rainColor: "#8abfff",
    orbColor: "#f29a38",
    orbOpacity: 1.0, 
    cloudOpacity: 0.88,    
    orbScale: 1.15,         
    showGlow: true,        
    showRain: false,
    showLightning: false,
    showStars: false,   
    cloudCount: 0,
    backgroundColor: "#8ac6ff",
    ambientIntensity: 0.42,   
    keyColor: "#fff0bc",
    keyIntensity: 1.0,        
    fillColor: "#cfeaff",
    fillIntensity: 0.28,
    bounceIntensity: 0.18,
    emissiveIntensity: 2.2
  },
  "mostly-sunny": {
    cloudColor: "#eaeef5",
    rainColor: "#8abfff",
    orbColor: "#f29a38",
    orbOpacity: 1.0, 
    cloudOpacity: 0.88,    
    orbScale: 1.15,         
    showGlow: true,        
    showRain: false,
    showLightning: false,
    showStars: false,   
    cloudCount: 2,
    backgroundColor: "#8ac6ff",
    ambientIntensity: 0.42,   
    keyColor: "#fff0bc",
    keyIntensity: 1.0,        
    fillColor: "#cfeaff",
    fillIntensity: 0.28,
    bounceIntensity: 0.18,
    emissiveIntensity: 2.2
  },
  "partly-cloudy": {
    cloudColor: "#eaeef5",
    rainColor: "#8abfff",
    orbColor: "#f29a38",
    orbOpacity: 1.0, 
    cloudOpacity: 0.88,    
    orbScale: 1.15,         
    showGlow: true,        
    showRain: false,
    showLightning: false,
    showStars: false,    
    cloudCount: 4,
    backgroundColor: "#8ac6ff",
    ambientIntensity: 0.42,   
    keyColor: "#fff0bc",
    keyIntensity: 1.0,        
    fillColor: "#cfeaff",
    fillIntensity: 0.28,
    bounceIntensity: 0.18,
    emissiveIntensity: 2.2
  },
  "partly-cloudy-night": {
    cloudColor: "#1f2b45",
    rainColor: "#8abfff",
    orbColor: "#e9e4d2" ,
    orbOpacity: 1.0,
    cloudOpacity: 0.88,
    orbScale: 1.15,
    showGlow: true,
    showRain: false,
    showLightning: false,
    showStars: true,
    cloudCount: 4,
    backgroundColor: "#0e1632",
    ambientIntensity: 0.42,
    keyColor: "#dfe8ff",
    keyIntensity: 1.0,
    fillColor: "#4a5c88",
    fillIntensity: 0.28,
    bounceIntensity: 0.18,
    emissiveIntensity: 1.1
  },
  "clear-night": {
    cloudColor: "#2f3e5e",
    rainColor: "#8abfff",
    orbColor: "#e9e4d2",
    orbOpacity: 0.8,
    cloudOpacity: 0.75,
    orbScale: 1.15,
    showGlow: true,
    showRain: false,
    showLightning: false,
    showStars: true,
    cloudCount: 0,
    backgroundColor: "#081a3a",
    ambientIntensity: 0.4,
    keyColor: "#d9e7ff",
    keyIntensity: 1.1,
    fillColor: "#3a5680",
    fillIntensity: 0.28,
    bounceIntensity: 0.18,
    emissiveIntensity: 1.1
  },
  haze: {
    cloudColor: "#b8bec3",     
    rainColor: "#93b6c9",
    orbColor: "#f8e69f",
    orbOpacity: 0.7,           // Reduce visibility in haze conditions.
    orbScale: 0.38,            // Use a medium orb size.
    showGlow: false,           // Disable the glow in haze conditions.
    showRain: false,
    showLightning: false,
    showStars: false,
    cloudOpacity: 0.8,
    cloudCount: 6,
    backgroundColor: "#9ea5ae",
    ambientIntensity: 0.5,
    keyColor: "#f7f3d1",
    keyIntensity: 0.85,
    fillColor: "#c6cbd4",
    fillIntensity: 0.3,
    bounceIntensity: 0.15,
    emissiveIntensity: 1.0
  },
  "haze-night": {
    cloudColor: "#4a4f57",
    rainColor: "#93b6c9",
    orbColor: "#d8cdb0",
    orbOpacity: 0.4,           // Dim, obscured moon through haze.
    orbScale: 0.38,
    showGlow: false,
    showRain: false,
    showLightning: false,
    showStars: false,          // Haze blocks stars at night just like it dims the sun by day.
    cloudOpacity: 0.8,
    cloudCount: 6,
    backgroundColor: "#2b2d33",
    ambientIntensity: 0.32,
    keyColor: "#cfc6ae",
    keyIntensity: 0.5,
    fillColor: "#55565c",
    fillIntensity: 0.22,
    bounceIntensity: 0.12,
    emissiveIntensity: 0.5
  },
  cloudy: {
    cloudColor: "#c7d2e4",     // Slightly brighter grey-blue clouds.
    rainColor: "#42bfff",
    // Keep the orb mostly obscured behind dense clouds.
    orbColor: "#d4dae5",
    orbOpacity: 0.35,          // Keep the orb faint.
    orbScale: 0.28,            // Use a smaller orb size.
    showGlow: false,           // Disable the glow.
    showRain: false,
    showLightning: false,
    showStars: false,
    // Increase cloud density for overcast coverage.
    cloudOpacity: 0.95,
    cloudCount: 8,
    // Darken the background relative to haze.
    backgroundColor: "#7e97ba",
    // Use softer and slightly dimmer lighting.
    ambientIntensity: 0.45,
    keyColor: "#f0f4f9",
    keyIntensity: 0.9,
    fillColor: "#cddedf",
    fillIntensity: 0.32,
    bounceIntensity: 0.2,
    emissiveIntensity: 0.6      // Keep emissive lighting low while the orb is hidden.
  },
  rain: {
    cloudColor: "#8f9db5",     // Darker cloud tone for rain scenes.
    rainColor: "#4fa8ff",      // Increase rain visibility slightly.

    // Keep the orb nearly hidden during rainfall.
    orbColor: "#cfd6e2",
    orbOpacity: 0.25,          // Reduce orb visibility further.
    orbScale: 0.22,
    showGlow: false,

    showRain: true,
    showLightning: true,          // Occasional distant thunder, far less often than a full storm.
    lightningStrikeChance: 0.12,
    lightningCooldown: [3, 6.5],
    showStars: false,

    // Use heavy cloud coverage.
    cloudOpacity: 1.0,
    cloudCount: 9,

    // Darken the background for rainy weather.
    backgroundColor: "#4f6b8a",

    // Lower the light levels for a subdued scene.
    ambientIntensity: 0.38,
    keyColor: "#cfe3f7",
    keyIntensity: 0.75,
    fillColor: "#9fb7d1",
    fillIntensity: 0.2,
    bounceIntensity: 0.12,

    emissiveIntensity: 0.4
  },
  "rainy-night": {
    cloudColor: "#2f3e5e",
    rainColor: "#6fbfff",

    orbColor: "#e8ecf8",   // Moon color.
    orbOpacity: 0.5,
    orbScale: 0.7,
    showGlow: false,

    showRain: true,        // Keep precipitation enabled.
    showLightning: true,   // Occasional distant thunder, far less often than a full storm.
    lightningStrikeChance: 0.12,
    lightningCooldown: [3, 6.5],
    showStars: false,

    cloudOpacity: 0.95,
    cloudCount: 9,

    backgroundColor: "#0b1b3a",

    ambientIntensity: 0.35,
    keyColor: "#cfe3ff",
    keyIntensity: 0.6,
    fillColor: "#3a5680",
    fillIntensity: 0.2,
    bounceIntensity: 0.1,

    emissiveIntensity: 0.3
  },

  storm: {
    cloudColor: "#0f141f",     // Near-black cloud tone for storms.
    rainColor: "#5fb3ff",      // Brighten rain streaks for contrast.

    // Push the orb almost entirely out of view.
    orbColor: "#c9d2e3",
    orbOpacity: 0.15,          // Keep the orb barely visible.
    orbScale: 0.22,
    showGlow: false,

    showRain: true,
    showLightning: true,
    showStars: false,

    // Maximize storm cloud coverage.
    cloudOpacity: 1,
    cloudCount: 10,

    // Use a deeper background tone for storm scenes.
    backgroundColor: "#0a1224",

    // Keep lighting low and directional.
    ambientIntensity: 0.32,
    keyColor: "#cfe8ff",
    keyIntensity: 0.7,
    fillColor: "#4a628a",
    fillIntensity: 0.12,
    bounceIntensity: 0.1,

    emissiveIntensity: 0.3
  },
  snow: {
    cloudColor: "#edf0f7",
    rainColor: "#ffffff",      // Render snow particles in white.
    showRain: true,

    orbColor: "#f7fbff",
    orbOpacity: 0.5,           // Soften the orb intensity.
    orbScale: 0.22,
    showGlow: false,

    cloudOpacity: 0.98,
    cloudCount: 8,

    backgroundColor: "#eaf4ff",

    ambientIntensity: 0.6,     // Lift ambient light for snowy scenes.
    keyColor: "#ffffff",
    keyIntensity: 1.0,
    fillColor: "#dfefff",
    fillIntensity: 0.4,
    bounceIntensity: 0.25
  },
  "snow-night": {
    cloudColor: "#3a4560",
    rainColor: "#ffffff",      // Snow particles stay white; keeps falling at night.
    showRain: true,

    orbColor: "#e9e4d2",
    orbOpacity: 0.55,
    orbScale: 0.3,
    showGlow: true,
    showLightning: false,
    showStars: true,

    cloudOpacity: 0.95,
    cloudCount: 7,

    backgroundColor: "#0e1830",

    ambientIntensity: 0.42,
    keyColor: "#d9e7ff",
    keyIntensity: 0.85,
    fillColor: "#3a4f70",
    fillIntensity: 0.26,
    bounceIntensity: 0.16,
    emissiveIntensity: 0.5
  },
  sunset: {
    cloudColor: "#f7e7dc",
    orbColor: "#ff9f54",
    orbOpacity: 1,
    orbScale: 0.8,        // Use a slightly larger orb.
    showGlow: true,

    backgroundColor: "#ff6a3d", // Deepen the sunset background tone.

    ambientIntensity: 0.5,
    keyColor: "#ffd6a3",
    keyIntensity: 1.4,
    fillColor: "#f4bb86",
    fillIntensity: 0.45,
    bounceIntensity: 0.3
  },
 night: {
    // Final catch-all night theme - only reached for conditions with no dedicated
    // night variant (e.g. "sunset" paired with isNight, which shouldn't normally
    // happen since dusk hours aren't flagged as night, but is handled safely here).
    cloudColor: "#2f3e5e",
    orbColor: "#e9e4d2",
    showRain: false,
    showLightning: false,

    orbOpacity: 0.8,           // Make the moon more prominent.
    orbScale: 1.15,            // Increase the moon size slightly.
    showGlow: true,            // Retain a subtle glow.

    backgroundColor: "#081a3a", // Deepen the night background tone.

    ambientIntensity: 0.4,
    keyColor: "#d9e7ff",
    keyIntensity: 1.1,
    fillColor: "#3a5680",
    fillIntensity: 0.28,
    bounceIntensity: 0.18,

    cloudOpacity: 0.75,
    cloudCount: 2,
    showStars: true
  },
  "cloudy-night": {
  cloudColor: "#2f3e5e",
  rainColor: "#8dc4ff",

  orbColor: "#dcdee5",
  orbOpacity: 0.7,
  orbScale: 0.7,
  showGlow: false,

  showRain: false,
  showLightning: false,
  showStars: false,

  cloudOpacity: 0.9,
  cloudCount: 9,

  backgroundColor: "#081a3a",

  ambientIntensity: 0.4,
  keyColor: "#d9e7ff",
  keyIntensity: 0.9,
  fillColor: "#3a5680",
  fillIntensity: 0.28,
  bounceIntensity: 0.18
}
};

function addCloudPuff(group: THREE.Group, color: string, x: number, y: number, z: number, scale: number, opacity: number) {
  
  // Apply subtle color variation to add depth.
  const variedColor = new THREE.Color(color).offsetHSL(
    0,
    0,
    (Math.random() - 0.5) * 0.08
  );

  const material = new THREE.MeshPhysicalMaterial({
    color: variedColor,
    emissive: variedColor.clone(),
    emissiveIntensity: 0,
    roughness: 0.9,
    metalness: 0,
    transmission: 0,
    clearcoat: 0,
    transparent: false,
    opacity: 1
  });

  const puff = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 48, 48), // Use a higher-detail sphere for smoother edges.
    material
  );
  // Puffs shadow each other (see the key light's shadow config) - this is
  // what carves out distinct, individually-lit lobes in a dense cluster
  // instead of every sphere looking lit the same regardless of neighbors.
  puff.castShadow = true;
  puff.receiveShadow = true;

  puff.position.set(x, y, z);

  // Vary the scale slightly to avoid uniform cloud shapes.
  puff.scale.set(
    scale,
    scale * (0.8 + Math.random() * 0.1),
    scale * (0.8 + Math.random() * 0.1)
  );

  group.add(puff);
  return { puff, material, baseColor: variedColor.clone() };
}


export function WeatherScene({ condition, isNight, numberText }: WeatherSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // The condition/isNight effect below tears down and rebuilds the entire
  // scene (clouds, lightning, camera, the lot). numberText changes far more
  // often than that (every temperature refresh) and shouldn't cause the same
  // full rebuild, so it's handled by a second, separate effect further down
  // that reaches into the still-live scene through this ref instead.
  const rebuildNumberRef = useRef<(text: string) => void>(() => {});
  const numberTextRef = useRef(numberText);
  numberTextRef.current = numberText;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    let themeKey: ThemeKey;

    if (isNight) {
      if (condition === "clear") {
        themeKey = "clear-night";
      } else if (condition === "mostly-sunny") {
        themeKey = "clear-night";
      } else if (condition === "partly-cloudy") {
        themeKey = "partly-cloudy-night";
      } else if (condition === "cloudy") {
        themeKey = "cloudy-night";
      } else if (condition === "rain") {
        themeKey = "rainy-night";
      } else if (condition === "storm") {
        themeKey = "storm";
      } else if (condition === "haze") {
        themeKey = "haze-night";
      } else if (condition === "snow") {
        themeKey = "snow-night";
      } else {
        themeKey = "night";
      }
    } else {
      themeKey = condition;   // Use the daytime theme directly.
    }

    const baseTheme = sceneThemes[themeKey];
    // Overcast themes (cloudy/rain/storm) keep the sun/moon orb subtly hidden
    // behind the clouds regardless of day or night - the sun/moon shouldn't be
    // visible through heavy cloud cover any more during the day than at night.
    const isHiddenOrbScene =
      themeKey === "cloudy" ||
      themeKey === "cloudy-night" ||
      themeKey === "rain" ||
      themeKey === "rainy-night" ||
      themeKey === "storm";
    const theme = {
      ...baseTheme,
      showGlow: isHiddenOrbScene ? false : true,
      orbScale: isHiddenOrbScene
        ? 0
        : isNight
        ? Math.max(baseTheme.orbScale, 1.05)
        : Math.max(baseTheme.orbScale, 0.95),
      orbOpacity: isHiddenOrbScene ? 0 : 1,
      emissiveIntensity: isHiddenOrbScene
        ? 0
        : Math.max((baseTheme as any).emissiveIntensity ?? 1.4, isNight ? 1.9 : 1.6)
    };
    // Rain (not snow, which reuses showRain with a white rainColor) - the
    // number grows small water droplets sliding down its surface in these.
    const numberIsWet = theme.showRain && theme.rainColor !== "#ffffff";
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Needed so the temperature number's own light (below) can cast real
    // shadows from its 3D geometry, instead of the old hand-painted ellipse.
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Three scenes sharing one renderer/camera, drawn back-to-front each
    // frame (see the render loop below): `scene` is the sky (clouds, rain,
    // orb), `numberScene` is the temperature number, `lightningScene` is
    // just the bolt. `scene`/`numberScene` are split because Three's
    // standard material lighting is scene-global - every light in a scene
    // affects every lit object in it. Without that split, the theme's
    // key/fill/bounce lights (which change color and intensity per weather
    // condition) would also spill onto the number, flattening its shading
    // and making it look different in every condition instead of the same
    // legible white+red-rim look everywhere. `lightningScene` is split out
    // for a different reason - draw order: it needs to render after (on top
    // of) the number so a strike visually lands on the number instead of
    // being hidden behind it.
    renderer.autoClear = false;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = null; // Keep the renderer background transparent.

    const numberScene = new THREE.Scene();
    const lightningScene = new THREE.Scene();

    // new RGBELoader().load(
    //   "https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr",
    //   (texture) => {
    //     texture.mapping = THREE.EquirectangularReflectionMapping;
    //     scene.environment = texture;
    //   }
    // );
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    camera.position.set(0, 0, 10.8);

    // Base ambient light. Dimmed relative to the key light (below) for more
    // dramatic puff-to-puff shading instead of a flat, evenly-lit look.
    scene.add(new THREE.AmbientLight("#ffffff", theme.ambientIntensity * 0.78));

    // Primary directional light for the sun or moon - boosted for stronger
    // contrast between lit and shadowed cloud puffs. Casts real shadows so
    // puffs shadow each other where they overlap, instead of every puff
    // being lit as if it were alone - this is what gives the cluster its
    // sculpted, individually-lobed look instead of a flat blob.
    const key = new THREE.DirectionalLight(theme.keyColor, theme.keyIntensity * 1.35);
    key.position.set(-3, 4, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -3;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 12;
    key.shadow.bias = -0.0015;
    key.shadow.radius = 3; // soften the puff-to-puff shadow edges a little
    scene.add(key);

    // Secondary fill light.
    const fill = new THREE.DirectionalLight(theme.fillColor, theme.fillIntensity * 0.85);
    fill.position.set(3, 2, 4);
    scene.add(fill);

    // Low bounce light to soften shadows.
    const bounce = new THREE.DirectionalLight("#ffffff", theme.bounceIntensity);
    bounce.position.set(0, -3, 2);
    scene.add(bounce);

    const cloud = new THREE.Group();
    const cloudMotions: CloudMotion[] = [];
    const isDenseCloudScene = theme.cloudCount >= 8;
    const isRainScene = theme.showRain;
    // Storm clouds should feel turbulent and fast-moving, not the same slow
    // drift as plain overcast/rain - boost speed and amplitude just for storm.
    const stormSpeedBoost = themeKey === "storm" ? 2.4 : 1;
    const stormAmpBoost = themeKey === "storm" ? 1.7 : 1;
    const isClearBirdScene =
      condition === "clear" || (!isNight && condition === "mostly-sunny");
    const cloudVerticalOffset =
      themeKey === "cloudy" ||
      themeKey === "cloudy-night" ||
      themeKey === "rain" ||
      themeKey === "rainy-night" ||
      themeKey === "storm"
        ? 0.2
        : 0;
    const orbHighlightColor = new THREE.Color(theme.orbColor);

    const baseCloudPositions = [
      [-1.4, 0.95, 0.1, 0.9],
      [-0.7, 1.18, 0.15, 1.02],
      [0.06, 1.24, 0.2, 1.22],
      [0.92, 1.1, 0.18, 1.04],
      [1.6, 0.9, 0.1, 0.86],
      [-0.16, 0.65, -0.08, 1.36],
      [0.86, 0.65, -0.05, 1]
    ];

    for (let i = 0; i < theme.cloudCount; i += 1) {
    const index = i % baseCloudPositions.length;
    const [x, y, z, scale] = baseCloudPositions[index];

    const jitterX = x + (Math.random() - 0.5) * 0.18;
      const jitterY = y - 0.34 + cloudVerticalOffset + (Math.random() - 0.5) * 0.12;
    const jitterScale = scale * (
      isDenseCloudScene
        ? 1.18 + Math.random() * 0.34
        : isRainScene
        ? 1.05 + Math.random() * 0.28
        : 0.85 + Math.random() * 0.2
    );

    // Split clouds between front and back layers.
    const isFront = i % 2 === 0;

    // Offset front-layer clouds to keep the orb visible.
    const offsetX = isFront ? (Math.random() > 0.5 ? 0.6 : -0.6) : 0;

      const initialX = jitterX + offsetX;
      const finalZ = isNight
        ? 0.04 + Math.random() * 0.26
        : (isFront ? 0.3 : -0.4) + (Math.random() - 0.5) * 0.18;

    const { puff, material, baseColor } = addCloudPuff(
      cloud,
      theme.cloudColor,
      initialX,
      jitterY,
      finalZ,
      jitterScale,
      theme.cloudOpacity
    );

    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: orbHighlightColor,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const highlightMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 20, 20),
      highlightMaterial
    );
    highlightMesh.scale.set(
      puff.scale.x * 0.42,
      puff.scale.y * 0.34,
      puff.scale.z * 0.3
    );
    puff.add(highlightMesh);

    cloudMotions.push({
      mesh: puff,
      material,
      baseColor,
      highlightMesh,
      highlightMaterial,
      baseX: initialX,
      baseY: jitterY,
      baseZ: finalZ,
      driftSpeed: (isDenseCloudScene ? 0.004 + Math.random() * 0.008 : 0.035 + Math.random() * 0.04 + (isFront ? 0.015 : 0)) * stormSpeedBoost,
      driftSpan: (isDenseCloudScene ? 0.45 + Math.random() * 0.5 : 5.8 + Math.random() * 1.8) * stormAmpBoost,
      bobAmp: (isDenseCloudScene ? 0.008 + Math.random() * 0.012 : 0.018 + Math.random() * 0.03) * stormAmpBoost,
      bobSpeed: (isDenseCloudScene ? 0.12 + Math.random() * 0.12 : 0.28 + Math.random() * 0.32) * stormSpeedBoost,
      bobPhase: Math.random() * Math.PI * 2,
      swayAmp: (isDenseCloudScene ? 0.015 + Math.random() * 0.025 : 0.08 + Math.random() * 0.12 + (isFront ? 0.04 : 0)) * stormAmpBoost,
      swaySpeed: (isDenseCloudScene ? 0.08 + Math.random() * 0.08 : 0.16 + Math.random() * 0.2) * stormSpeedBoost,
      swayPhase: Math.random() * Math.PI * 2,
      rollAmp: (isDenseCloudScene ? 0.004 + Math.random() * 0.01 : 0.02 + Math.random() * 0.03) * stormAmpBoost,
      rollSpeed: (isDenseCloudScene ? 0.05 + Math.random() * 0.06 : 0.14 + Math.random() * 0.12) * stormSpeedBoost,
      scalePulseAmp: isDenseCloudScene ? 0.04 + Math.random() * 0.03 : 0.018 + Math.random() * 0.018,
      scalePulseSpeed: isDenseCloudScene ? 0.09 + Math.random() * 0.08 : 0.18 + Math.random() * 0.14,
      scalePulsePhase: Math.random() * Math.PI * 2,
      highlightPhase: Math.random() * Math.PI * 2,
      initialScale: puff.scale.clone()
    });

  }


    // Ground shadow beneath the number/scene - always present regardless of
    // cloud count, since it grounds the whole composition, not just the clouds.
    const underShadow = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 32, 32),
      new THREE.MeshBasicMaterial({ color: "#1c1c22", transparent: true, opacity: 0.3 })
    );
    underShadow.position.set(0, -1.02, 0.18);
    underShadow.scale.set(1.06, 0.17, 0.7);
    cloud.add(underShadow);
    scene.add(cloud);

    // ------------------------------------------------------------------
    // TEMPERATURE NUMBER - real extruded 3D glyphs built from the app's own
    // Bebas Neue font (see src/lib/digitGeometry.ts), replacing the old
    // 2D-canvas fake-3D. Lit by its own small rig below instead of the
    // theme's key/fill/bounce lights above, so it stays legible and reads
    // the same bright white in every condition - matching how it always
    // looked before this was real geometry, rather than getting moody/dim
    // along with the sky during storm/night themes.
    // ------------------------------------------------------------------
    // Template only - each digit gets its own clone (below) so a lightning
    // strike can char/fade one digit's material without touching the rest.
    const numberMaterialTemplate = new THREE.MeshStandardMaterial({
      color: "#f4f5f8",
      roughness: 0.38,
      metalness: 0.06
    });
    const NUMBER_BASE_COLOR = new THREE.Color("#f4f5f8");
    const NUMBER_CHAR_COLOR = new THREE.Color("#160e0b");

    // Casts the shadow every digit falls onto numberShadowCatcher below -
    // shadow camera frustum is just big enough to cover the number's area.
    const numberKeyLight = new THREE.DirectionalLight("#e8ecf5", 2.4);
    numberKeyLight.position.set(0.6, 1.7, 3.2);
    numberKeyLight.castShadow = true;
    numberKeyLight.shadow.mapSize.set(512, 512);
    numberKeyLight.shadow.camera.left = -2.2;
    numberKeyLight.shadow.camera.right = 2.2;
    numberKeyLight.shadow.camera.top = 2.2;
    numberKeyLight.shadow.camera.bottom = -2.2;
    numberKeyLight.shadow.camera.near = 1;
    numberKeyLight.shadow.camera.far = 7;
    numberKeyLight.shadow.bias = -0.0025;
    numberScene.add(numberKeyLight);
    // A DirectionalLight's shadow camera looks from its position toward its
    // target (the origin by default) - since the number sits well below
    // world y=0 (see numberGroup below), the target needs to follow it or
    // the shadow camera stays centered on empty space and the shadow clips.
    numberScene.add(numberKeyLight.target);

    // Small ambient lift so the number's shadow side doesn't fall to pure
    // black - scoped to numberScene, so it can't wash out the moody dark
    // clouds in storm/night themes the way a scene-wide ambient would.
    numberScene.add(new THREE.AmbientLight("#ffffff", 0.26));

    // The same red rim-glow accent the reference look (and the old 2D
    // version) used along the top edges of each digit.
    const numberRimLight = new THREE.PointLight("#ff2a1f", 10, 10, 2);
    numberRimLight.position.set(-0.3, 0.9, 1.6);
    numberScene.add(numberRimLight);

    const numberFillLight = new THREE.DirectionalLight("#6f8fff", 0.22);
    numberFillLight.position.set(-1.4, -0.2, 1.6);
    numberScene.add(numberFillLight);

    const numberGroup = new THREE.Group();
    // Lower in the frame than the clouds, closer to where the falling rain
    // reaches and the city/location label sits below.
    numberGroup.position.set(0, -0.64, 0.9);
    numberScene.add(numberGroup);
    numberKeyLight.target.position.copy(numberGroup.position);

    // Invisible except where numberGroup's cast shadow actually lands on it -
    // this is what gives each digit its own real, individually-shaped
    // shadow, instead of one hand-painted ellipse shared by the whole number.
    const numberShadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 2),
      new THREE.ShadowMaterial({ opacity: 0.48 })
    );
    // Close beneath the digits' own bottom edge, not the middle of the
    // scene - too far below and the shadow reads as a second, disconnected
    // "ghost" number instead of grounding the real one.
    numberShadowCatcher.position.set(0, -1.38, 0.7);
    numberShadowCatcher.receiveShadow = true;
    numberScene.add(numberShadowCatcher);

    const NUMBER_SCALE = 0.00205;
    let numberLetterMeshes: THREE.Mesh[] = [];
    let numberBuildToken = 0;
    let sceneDisposed = false;

    // --- Storm wind: each digit sways independently, like it's being ---
    // --- buffeted, rather than the whole number moving as one block.  ---
    function makeWindMotion() {
      return {
        phase: Math.random() * Math.PI * 2,
        freqX: 1.0 + Math.random() * 0.7,
        freqY: 1.5 + Math.random() * 0.8,
        ampX: 0.028 + Math.random() * 0.02,
        ampY: 0.012 + Math.random() * 0.01,
        rotAmp: 0.045 + Math.random() * 0.03
      };
    }

    // --- Lightning burn: ignite (char sweeps down) -> ash (crumbles to ---
    // --- nothing, with flecks) -> pause (gone) -> regen (glows back in). --
    const IGNITE_MS = 320;
    const ASH_MS = 380;
    const PAUSE_MS = 220;
    const REGEN_MS = 480;
    const DIGIT_BURN_STAGGER_MS = 55;

    function phaseDurationMs(phase: string) {
      if (phase === "ignite") return IGNITE_MS;
      if (phase === "ash") return ASH_MS;
      if (phase === "pause") return PAUSE_MS;
      if (phase === "regen") return REGEN_MS;
      return 1;
    }
    function nextBurnPhase(phase: string) {
      if (phase === "ignite") return "ash";
      if (phase === "ash") return "pause";
      if (phase === "pause") return "regen";
      return "idle";
    }
    function easeOutBack(t: number) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      const x = t - 1;
      return 1 + c3 * x * x * x + c1 * x * x;
    }

    // Small ember/ash flecks that fly out of a digit while it's crumbling -
    // plain children of the digit mesh so they inherit its position for
    // free and get cleaned up automatically when the mesh is removed.
    function spawnAshFlecks(mesh: THREE.Mesh) {
      const fleckGeometry = new THREE.BoxGeometry(10, 10, 10);
      const flecks: { mesh: THREE.Mesh; angle: number; speed: number }[] = [];
      for (let i = 0; i < 6; i += 1) {
        const ember = Math.random() > 0.45;
        const fleckMaterial = new THREE.MeshBasicMaterial({
          color: ember ? "#ffab5c" : "#161311",
          transparent: true,
          opacity: 1
        });
        const fleck = new THREE.Mesh(fleckGeometry, fleckMaterial);
        fleck.position.set(0, 0, 40);
        mesh.add(fleck);
        flecks.push({
          mesh: fleck,
          angle: -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3,
          speed: 90 + Math.random() * 140
        });
      }
      return flecks;
    }

    // --- Wet look: small droplets sliding down the digit's front face, ---
    // --- only spawned when numberIsWet (rain/storm/rainy-night). ---
    // Shared geometry/material - only position/scale differ per droplet, so
    // there's no need for each of the ~5 droplets per digit to own one.
    const dropletGeometry = new THREE.SphereGeometry(9, 10, 8);
    dropletGeometry.scale(1, 1.6, 0.6); // squashed into a teardrop pressed flat against the surface
    const dropletMaterial = new THREE.MeshStandardMaterial({
      color: "#eaf6ff",
      emissive: "#bcdcff",
      emissiveIntensity: 0.35, // a little self-glow so tiny droplets still read against a dark digit
      transparent: true,
      opacity: 0.85,
      roughness: 0.08,
      metalness: 0
    });
    // Sits just proud of the extrusion's camera-facing cap (depth=260 below)
    // so droplets don't z-fight with/clip into the glyph surface.
    const DROPLET_FRONT_Z = 266;

    function spawnRainDroplets(mesh: THREE.Mesh) {
      const box = mesh.geometry.boundingBox;
      if (!box) {
        return [];
      }
      const droplets: { mesh: THREE.Mesh; speed: number; minX: number; maxX: number; topY: number; bottomY: number }[] = [];
      const count = 6 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i += 1) {
        const droplet = new THREE.Mesh(dropletGeometry, dropletMaterial);
        const x = box.min.x + Math.random() * (box.max.x - box.min.x);
        const y = box.min.y + Math.random() * (box.max.y - box.min.y);
        droplet.position.set(x, y, DROPLET_FRONT_Z);
        const s = 0.7 + Math.random() * 0.6;
        droplet.scale.set(s, s * (1 + Math.random() * 0.4), s);
        mesh.add(droplet);
        droplets.push({
          mesh: droplet,
          speed: 35 + Math.random() * 45,
          minX: box.min.x,
          maxX: box.max.x,
          topY: box.max.y,
          bottomY: box.min.y
        });
      }
      return droplets;
    }

    // Loads/builds the glyphs for `text` and swaps numberGroup's children
    // once ready. Async because the font (and each new character's
    // geometry) loads/builds lazily - see digitGeometry.ts. numberBuildToken
    // guards against an in-flight call from a stale, since-superseded text
    // value clobbering a newer one once it resolves.
    const rebuildNumber = (text: string) => {
      const token = ++numberBuildToken;
      layoutText(text).then((layout) => {
        if (sceneDisposed || token !== numberBuildToken) {
          return;
        }
        numberLetterMeshes.forEach((mesh) => numberGroup.remove(mesh));
        numberLetterMeshes = layout.letters.map((letter) => {
          const material = numberMaterialTemplate.clone();
          const mesh = new THREE.Mesh(letter.geometry, material);
          mesh.castShadow = true;
          const baseX = (letter.x - layout.centerX) * NUMBER_SCALE;
          const baseY = -layout.centerY * NUMBER_SCALE;
          mesh.position.set(baseX, baseY, 0);
          mesh.scale.setScalar(NUMBER_SCALE);
          mesh.userData.baseX = baseX;
          mesh.userData.baseY = baseY;
          mesh.userData.wind = makeWindMotion();
          mesh.userData.burnPhase = "idle";
          mesh.userData.burnPhaseStart = 0;
          mesh.userData.flecks = [];
          mesh.userData.droplets = numberIsWet ? spawnRainDroplets(mesh) : [];
          numberGroup.add(mesh);
          return mesh;
        });
      });
    };

    // Exposed so the separate numberText effect (below, in the component
    // body) can update just the digits without tearing down this whole
    // condition/isNight-driven scene.
    rebuildNumberRef.current = rebuildNumber;
    rebuildNumber(numberTextRef.current);

    // Starts every currently-idle digit's burn cycle, each offset a little
    // so the whole number doesn't ignite/reform in perfect unison.
    function triggerNumberBurn(nowMs: number) {
      numberLetterMeshes.forEach((mesh, index) => {
        if (mesh.userData.burnPhase !== "idle") {
          return;
        }
        mesh.userData.burnPhase = "ignite";
        mesh.userData.burnPhaseStart = nowMs + index * DIGIT_BURN_STAGGER_MS;
      });
    }

    // Called every frame: applies wind sway (storm only), slides rain
    // droplets down each digit's face, and steps the burn animation forward.
    function updateNumberDigits(nowMs: number, deltaSeconds: number, windActive: boolean) {
      numberLetterMeshes.forEach((mesh) => {
        const wind = mesh.userData.wind;
        if (windActive) {
          const t = nowMs / 1000;
          const sway =
            Math.sin(t * wind.freqX + wind.phase) * wind.ampX * 0.6 +
            Math.sin(t * wind.freqX * 1.9 + wind.phase * 1.4) * wind.ampX * 0.4;
          const bob = Math.sin(t * wind.freqY + wind.phase) * wind.ampY;
          const rot = Math.sin(t * wind.freqX * 0.8 + wind.phase) * wind.rotAmp;
          mesh.position.x = mesh.userData.baseX + sway;
          mesh.position.y = mesh.userData.baseY + bob;
          mesh.rotation.z = rot;
        } else if (mesh.rotation.z !== 0 || mesh.position.x !== mesh.userData.baseX) {
          mesh.position.x = mesh.userData.baseX;
          mesh.position.y = mesh.userData.baseY;
          mesh.rotation.z = 0;
        }

        if (mesh.visible && mesh.userData.droplets.length > 0) {
          type Droplet = { mesh: THREE.Mesh; speed: number; minX: number; maxX: number; topY: number; bottomY: number };
          mesh.userData.droplets.forEach((droplet: Droplet) => {
            droplet.mesh.position.y -= droplet.speed * deltaSeconds;
            if (droplet.mesh.position.y < droplet.bottomY) {
              // Back to a fresh random spot near the top, not just straight
              // back up the same column - reads as a new droplet forming.
              droplet.mesh.position.y = droplet.topY;
              droplet.mesh.position.x = droplet.minX + Math.random() * (droplet.maxX - droplet.minX);
            }
          });
        }

        const phase = mesh.userData.burnPhase;
        if (phase === "idle") {
          return;
        }

        if (nowMs < mesh.userData.burnPhaseStart) {
          return; // staggered start - not this digit's turn yet
        }

        const elapsedInPhase = nowMs - mesh.userData.burnPhaseStart;
        const duration = phaseDurationMs(phase);
        const localT = Math.min(1, elapsedInPhase / duration);
        const material = mesh.material as THREE.MeshStandardMaterial;

        if (phase === "ignite") {
          mesh.visible = true;
          mesh.scale.setScalar(NUMBER_SCALE);
          material.opacity = 1;
          material.transparent = false;
          material.color.copy(NUMBER_BASE_COLOR).lerp(NUMBER_CHAR_COLOR, localT);
          material.emissive.set("#ff7a3d");
          material.emissiveIntensity = Math.sin(localT * Math.PI) * 0.9;
        } else if (phase === "ash") {
          if (mesh.userData.flecks.length === 0) {
            mesh.userData.flecks = spawnAshFlecks(mesh);
          }
          mesh.visible = true;
          material.transparent = true;
          material.color.copy(NUMBER_CHAR_COLOR);
          material.emissive.set("#3a1a10");
          material.emissiveIntensity = Math.max(0, 0.4 * (1 - localT));
          material.opacity = 1 - localT;

          const flyOut = easeOutBack(Math.min(1, localT * 0.9));
          mesh.userData.flecks.forEach((fleck: { mesh: THREE.Mesh; angle: number; speed: number }) => {
            const dist = fleck.speed * flyOut;
            fleck.mesh.position.x = Math.cos(fleck.angle) * dist;
            fleck.mesh.position.y = Math.sin(fleck.angle) * dist - localT * 60;
            const fleckMaterial = fleck.mesh.material as THREE.MeshBasicMaterial;
            fleckMaterial.opacity = Math.max(0, 1 - localT * 1.15);
          });
        } else if (phase === "pause") {
          mesh.visible = false;
        } else if (phase === "regen") {
          mesh.userData.flecks.forEach((fleck: { mesh: THREE.Mesh }) => mesh.remove(fleck.mesh));
          mesh.userData.flecks = [];
          mesh.visible = true;
          material.transparent = true;
          material.color.copy(NUMBER_CHAR_COLOR).lerp(NUMBER_BASE_COLOR, Math.min(1, localT * 1.4));
          const flashT = Math.max(0, 1 - localT / 0.55);
          material.emissive.set("#fff4d6");
          material.emissiveIntensity = flashT * 1.1;
          material.opacity = Math.min(1, localT * 1.6);
        }

        if (localT >= 1) {
          mesh.userData.burnPhase = nextBurnPhase(phase);
          mesh.userData.burnPhaseStart = nowMs;
          if (mesh.userData.burnPhase === "idle") {
            material.opacity = 1;
            material.transparent = false;
            material.color.copy(NUMBER_BASE_COLOR);
            material.emissiveIntensity = 0;
            mesh.scale.setScalar(NUMBER_SCALE);
            mesh.visible = true;
          }
        }
      });
    }

    const orb = !isHiddenOrbScene ? new THREE.Mesh(
    new THREE.CircleGeometry(theme.orbScale, 48),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(theme.orbColor),
      transparent: true,
      opacity: theme.orbOpacity
    })
    ) : null;
    if (orb) {
      orb.position.set(0, 1.56, -0.9);
      scene.add(orb);
    }

    if (theme.showGlow && orb) {
      const glowGeometry = new THREE.CircleGeometry(theme.orbScale * 1.12, 48);
      const glowMaterial = new THREE.MeshBasicMaterial({
      color: theme.orbColor,   // Match the orb color.
      transparent: true,
      opacity: 0.11,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.set(0, 1.38, -1.05);
      glowMesh.scale.set(1.28, 1.08, 1);
      glowMesh.renderOrder = -1;
      scene.add(glowMesh);
    }

    const starGroup = new THREE.Group();
    const starMotions: StarMotion[] = [];
    if (theme.showStars) {
      for (let index = 0; index < 14; index += 1) {
        const starMaterial = new THREE.MeshBasicMaterial({
          color: theme.orbColor === "#f7f9ff" ? "#ffe" : "#ffd76a",
          transparent: true,
          opacity: 0.7 + Math.random() * 0.25
        });
        const baseScale = 0.04 + Math.random() * 0.018;
        const star = new THREE.Mesh(
          new THREE.SphereGeometry(baseScale, 12, 12),
          starMaterial
        );
        const spreadX = -2 + Math.random() * 4;
        const spreadY = 1.2 + Math.random() * 1.4; // Spread stars across a taller vertical range.

        star.position.set(spreadX, spreadY, -2.1);
        star.renderOrder = -5;
        starGroup.add(star);
        starMotions.push({
          mesh: star,
          material: starMaterial,
          baseScale,
          twinkleSpeed: 0.7 + Math.random() * 1.6,
          twinklePhase: Math.random() * Math.PI * 2,
          pulseDepth: 0.18 + Math.random() * 0.2
        });
      }
    }
    starGroup.renderOrder = -5;
    scene.add(starGroup);

    const rainGroup = new THREE.Group();
    const rainMotions: RainMotion[] = [];
    // Small rounded droplets, same shape/size family as the droplets that
    // slide down the number's face (see spawnRainDroplets in the number
    // section below) - falling rain and "wet number" droplets should read
    // as the same water, not two unrelated particle styles.
    const rainDropGeometry = new THREE.SphereGeometry(0.045, 8, 6);
    rainDropGeometry.scale(1, 1.5, 0.55);
    if (theme.showRain) {
      for (let index = 0; index < 18; index += 1) {
        const anchor = cloudMotions[index % Math.max(cloudMotions.length, 1)];
        const length = 0.26 + Math.random() * 0.16; // still drives the fall-cycle distance below
        const drop = new THREE.Mesh(
          rainDropGeometry,
          new THREE.MeshBasicMaterial({ color: theme.rainColor })
        );
        drop.position.set((Math.random() - 0.5) * 4.2, 1.1 + Math.random() * 2.1, (Math.random() - 0.5) * 0.6);
        rainGroup.add(drop);
        if (anchor) {
          rainMotions.push({
            mesh: drop,
            anchor,
            fallSpeed: 0.1 + Math.random() * 0.045,
            length,
            lateralOffset: (Math.random() - 0.5) * Math.max(0.4, anchor.initialScale.x * 0.55),
            depthOffset: (Math.random() - 0.5) * 0.16,
            resetOffset: Math.random() * 1.4
          });
        }
      }
    }
    scene.add(rainGroup);

    const birdGroup = new THREE.Group();
    const birdMotions: BirdMotion[] = [];
    if (isClearBirdScene) {
      for (let index = 0; index < 5; index += 1) {
        const bird = new THREE.Group();
        const wingMaterial = new THREE.MeshBasicMaterial({
          color: "#1a2233",
          transparent: true,
          opacity: 0.82
        });
        const wingGeometry = new THREE.BoxGeometry(0.16, 0.018, 0.01);
        const wingLeft = new THREE.Mesh(wingGeometry, wingMaterial);
        const wingRight = new THREE.Mesh(wingGeometry, wingMaterial.clone());
        wingLeft.position.set(-0.08, 0, 0);
        wingRight.position.set(0.08, 0, 0);
        bird.add(wingLeft);
        bird.add(wingRight);
        bird.position.set(-3.8 - index * 0.55, 1.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.18);
        bird.scale.setScalar(0.9 - index * 0.08);
        birdGroup.add(bird);
        birdMotions.push({
          group: bird,
          wingLeft,
          wingRight,
          speed: 0.16 + Math.random() * 0.05,
          bobAmp: 0.03 + Math.random() * 0.02,
          bobSpeed: 0.9 + Math.random() * 0.45,
          phase: Math.random() * Math.PI * 2,
          wingSpeed: 8 + Math.random() * 4,
          wingAmp: 0.72 + Math.random() * 0.18,
          startX: bird.position.x,
          travel: 8.4 + Math.random() * 1.4,
          baseY: bird.position.y,
          baseZ: bird.position.z
        });
      }
    }
    scene.add(birdGroup);

    const lightning = new THREE.Group();
    const lightningMat = new THREE.MeshBasicMaterial({
      color: "#f7f3d6",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    const lightningGlowMat = new THREE.MeshBasicMaterial({
      color: "#8fc8ff",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const l1Glow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 0.03), lightningGlowMat);
    l1Glow.position.set(0.44, 1.18, 0.8);
    l1Glow.rotation.z = 0.6;
    l1Glow.renderOrder = 6;
    lightning.add(l1Glow);
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.86, 0.02), lightningMat);
    l1.position.set(0.44, 1.18, 0.82);
    l1.rotation.z = 0.6;
    l1.renderOrder = 7;
    lightning.add(l1);
    const l2Glow = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.62, 0.03), lightningGlowMat);
    l2Glow.position.set(0.66, 0.82, 0.8);
    l2Glow.rotation.z = -0.7;
    l2Glow.renderOrder = 6;
    lightning.add(l2Glow);
    const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.58, 0.02), lightningMat);
    l2.position.set(0.66, 0.82, 0.82);
    l2.rotation.z = -0.7;
    l2.renderOrder = 7;
    lightning.add(l2);
    const l3Glow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.03), lightningGlowMat);
    l3Glow.position.set(0.53, 0.55, 0.8);
    l3Glow.rotation.z = 0.38;
    l3Glow.renderOrder = 6;
    lightning.add(l3Glow);
    const l3 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.02), lightningMat);
    l3.position.set(0.53, 0.55, 0.82);
    l3.rotation.z = 0.38;
    l3.renderOrder = 7;
    lightning.add(l3);

    // Storm-only continuation: the original three segments stayed within the
    // cloud band. These extend the same jagged path on down through the
    // number's on-screen area so a storm strike reads as hitting the number,
    // not just flashing somewhere above it.
    const isStormScene = themeKey === "storm";
    const l4Glow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.03), lightningGlowMat);
    l4Glow.position.set(0.61, 0.22, 0.8);
    l4Glow.rotation.z = -0.5;
    l4Glow.renderOrder = 6;
    l4Glow.visible = isStormScene;
    lightning.add(l4Glow);
    const l4 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.27, 0.02), lightningMat);
    l4.position.set(0.61, 0.22, 0.82);
    l4.rotation.z = -0.5;
    l4.renderOrder = 7;
    l4.visible = isStormScene;
    lightning.add(l4);
    const l5Glow = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.36, 0.03), lightningGlowMat);
    l5Glow.position.set(0.47, -0.13, 0.8);
    l5Glow.rotation.z = 0.42;
    l5Glow.renderOrder = 6;
    l5Glow.visible = isStormScene;
    lightning.add(l5Glow);
    const l5 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.33, 0.02), lightningMat);
    l5.position.set(0.47, -0.13, 0.82);
    l5.rotation.z = 0.42;
    l5.renderOrder = 7;
    l5.visible = isStormScene;
    lightning.add(l5);
    const l6Glow = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.32, 0.03), lightningGlowMat);
    l6Glow.position.set(0.56, -0.47, 0.8);
    l6Glow.rotation.z = -0.32;
    l6Glow.renderOrder = 6;
    l6Glow.visible = isStormScene;
    lightning.add(l6Glow);
    const l6 = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.29, 0.02), lightningMat);
    l6.position.set(0.56, -0.47, 0.82);
    l6.rotation.z = -0.32;
    l6.renderOrder = 7;
    l6.visible = isStormScene;
    lightning.add(l6);

    lightning.renderOrder = 6;
    // Its own scene, rendered last (see the render loop) so the bolt draws
    // on top of the number instead of being hidden behind it - it should
    // read as striking down onto the number, not flashing somewhere behind.
    lightningScene.add(lightning);

    // A real point light at the strike position, not a flat scene-wide tint -
    // physical falloff (distance/decay) naturally gives more light near the
    // strike and less further away.
    const lightningFlashLight = new THREE.PointLight("#dce8ff", 0, 6, 2);
    lightningFlashLight.position.set(0.5, 1.0, 1.3);
    scene.add(lightningFlashLight);

    const clock = new THREE.Clock();
    let frameId = 0;
    let lightningTimer = 0;
    let isFlashing = false;
    // Cooldown between number burn cycles - storm strikes flash roughly
    // every 0.6-1.8s, far more often than the ~1.5s burn animation needs to
    // restart, so most strikes just flash without re-igniting the number.
    let lastNumberBurnAtMs = -Infinity;

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      cloud.position.x = (isDenseCloudScene ? Math.sin(elapsed * 0.04 * stormSpeedBoost) * 0.012 : Math.sin(elapsed * 0.08) * 0.05) * stormAmpBoost;
      cloud.position.y = (isDenseCloudScene ? Math.sin(elapsed * 0.08 * stormSpeedBoost) * 0.01 : Math.sin(elapsed * 0.22) * 0.025) * stormAmpBoost;
      cloud.rotation.z = (isDenseCloudScene ? Math.sin(elapsed * 0.05 * stormSpeedBoost) * 0.004 : Math.sin(elapsed * 0.11) * 0.015) * stormAmpBoost;

      if (orb) {
        orb.position.y = 1.08 + Math.sin(elapsed * 1.4) * 0.025;
      }

      updateNumberDigits(performance.now(), delta, isStormScene);

      cloudMotions.forEach((cloudMotion, index) => {
        const rawDrift = ((elapsed * cloudMotion.driftSpeed) + index * 0.73) % cloudMotion.driftSpan;
        const wrappedX = isDenseCloudScene
          ? cloudMotion.baseX + Math.sin(elapsed * cloudMotion.driftSpeed * 4 + index) * cloudMotion.driftSpan
          : cloudMotion.baseX - cloudMotion.driftSpan / 2 + rawDrift;
        const horizontalSway = Math.sin(elapsed * cloudMotion.swaySpeed + cloudMotion.swayPhase) * cloudMotion.swayAmp;
        const verticalBob = Math.sin(elapsed * cloudMotion.bobSpeed + cloudMotion.bobPhase) * cloudMotion.bobAmp;
        const depthSway = Math.cos(elapsed * (cloudMotion.swaySpeed * 0.7) + cloudMotion.swayPhase) * (isDenseCloudScene ? cloudMotion.swayAmp * 0.12 : cloudMotion.swayAmp * 0.35);
        const scalePulse = 1 + Math.sin(elapsed * cloudMotion.scalePulseSpeed + cloudMotion.scalePulsePhase) * cloudMotion.scalePulseAmp;
        const nextX = wrappedX + horizontalSway;
        const nextY = cloudMotion.baseY + verticalBob;
        const nextZ = cloudMotion.baseZ + depthSway;
        cloudMotion.mesh.position.x = nextX;
        cloudMotion.mesh.position.y = nextY;
        cloudMotion.mesh.position.z = nextZ;
        cloudMotion.mesh.rotation.z = Math.sin(elapsed * cloudMotion.rollSpeed + cloudMotion.bobPhase) * cloudMotion.rollAmp;
        cloudMotion.mesh.rotation.y = Math.cos(elapsed * (cloudMotion.rollSpeed * 0.8) + cloudMotion.swayPhase) * (cloudMotion.rollAmp * 2.2);
        cloudMotion.material.color.copy(cloudMotion.baseColor);
        cloudMotion.material.emissive.copy(cloudMotion.baseColor);
        cloudMotion.material.emissiveIntensity = 0;
        cloudMotion.highlightMesh.position.set(0, 0, 0);
        cloudMotion.highlightMaterial.color.copy(orbHighlightColor);
        cloudMotion.highlightMaterial.opacity = 0;
        cloudMotion.mesh.scale.set(
          cloudMotion.initialScale.x * scalePulse,
          cloudMotion.initialScale.y * (1 + Math.cos(elapsed * cloudMotion.scalePulseSpeed + cloudMotion.scalePulsePhase) * (cloudMotion.scalePulseAmp * (isDenseCloudScene ? 1.05 : 0.7))),
          cloudMotion.initialScale.z * (1 + Math.sin(elapsed * (cloudMotion.scalePulseSpeed * 0.85) + cloudMotion.scalePulsePhase) * (cloudMotion.scalePulseAmp * (isDenseCloudScene ? 0.85 : 0.55)))
        );
      });

      starMotions.forEach((starMotion, index) => {
        const shimmer = 0.72 + Math.sin(elapsed * starMotion.twinkleSpeed + starMotion.twinklePhase) * starMotion.pulseDepth;
        const microFlicker = 0.94 + Math.sin(elapsed * (starMotion.twinkleSpeed * 2.3) + index) * 0.06;
        const twinkle = shimmer * microFlicker;
        starMotion.material.opacity = Math.max(0.18, Math.min(1, twinkle));
        const scale = starMotion.baseScale * (0.92 + twinkle * 0.28);
        starMotion.mesh.scale.setScalar(scale / starMotion.baseScale);
      });

      rainMotions.forEach((rainMotion, index) => {
        const anchorScaleY = rainMotion.anchor.mesh.scale.y;
        const sourceX = cloud.position.x + rainMotion.anchor.mesh.position.x + rainMotion.lateralOffset;
        const sourceY = cloud.position.y + rainMotion.anchor.mesh.position.y - anchorScaleY * 0.42;
        const sourceZ = cloud.position.z + rainMotion.anchor.mesh.position.z + rainMotion.depthOffset;
        const fallCycle = (elapsed * rainMotion.fallSpeed * 3 + rainMotion.resetOffset + index * 0.17) % 2.9;

        rainMotion.mesh.position.x = sourceX;
        rainMotion.mesh.position.y = sourceY - fallCycle;
        rainMotion.mesh.position.z = sourceZ;
        rainMotion.mesh.scale.y = 0.95 + Math.sin(elapsed * 2.2 + index) * 0.08;
      });

      birdMotions.forEach((birdMotion, index) => {
        const travel = ((elapsed * birdMotion.speed) + index * 0.43) % birdMotion.travel;
        birdMotion.group.position.x = birdMotion.startX + travel;
        birdMotion.group.position.y = birdMotion.baseY + Math.sin(elapsed * birdMotion.bobSpeed + birdMotion.phase) * birdMotion.bobAmp;
        birdMotion.group.position.z = birdMotion.baseZ + Math.cos(elapsed * 0.6 + birdMotion.phase) * 0.03;
        const flap = Math.sin(elapsed * birdMotion.wingSpeed + birdMotion.phase) * birdMotion.wingAmp;
        birdMotion.wingLeft.rotation.z = -0.3 - flap;
        birdMotion.wingRight.rotation.z = 0.3 + flap;
      });

      if (theme.showLightning) {
        lightningTimer -= delta;

        if (lightningTimer <= 0) {
          const strikeChance = theme.lightningStrikeChance ?? 0.55;
          const [cooldownMin, cooldownMax] = theme.lightningCooldown ?? [0.35, 1.0];

          if (Math.random() < strikeChance) {
            isFlashing = true;
            lightningTimer = 0.16;

            // A new strike each time, not the same spot - move the whole bolt
            // group (and its light) to a random point across the cloud base.
            // Narrower than the full cloud spread since the bolts themselves
            // sit ~0.5 units right of the group's own origin - this keeps the
            // strike within the dense middle cluster of puffs, not the sparse
            // outer edges (or empty space past them).
            const strikeX = -1.2 + Math.random() * 1.6;
            const strikeY = 0.15 + Math.random() * 0.35;
            lightning.position.set(strikeX, strikeY, 0);
            lightningFlashLight.position.set(strikeX + 0.5, strikeY + 1.0, 1.3);

            if (isStormScene) {
              const nowMs = performance.now();
              if (nowMs - lastNumberBurnAtMs > 4500) {
                lastNumberBurnAtMs = nowMs;
                triggerNumberBurn(nowMs);
              }
            }
          } else {
            isFlashing = false;
            lightningTimer = cooldownMin + Math.random() * (cooldownMax - cooldownMin);
          }
        }

        // Fade lightning intensity in and out smoothly.
        if (isFlashing) {
          lightningMat.opacity = Math.min(1, lightningMat.opacity + 0.4);
          lightningGlowMat.opacity = Math.min(0.55, lightningGlowMat.opacity + 0.22);
          lightningFlashLight.intensity = Math.min(4, lightningFlashLight.intensity + 1.6);
        } else {
          lightningMat.opacity *= 0.85;
          lightningGlowMat.opacity *= 0.78;
          lightningFlashLight.intensity *= 0.8;
        }
      }

      // Three passes, back to front, into the same canvas (autoClear is off -
      // see the note by its declaration above): sky, then the number, then
      // the lightning bolt last so it draws on top of the number - clearing
      // just the depth buffer between each keeps every scene's own
      // lights/shadows from leaking into the others.
      renderer.clear();
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(numberScene, camera);
      renderer.clearDepth();
      renderer.render(lightningScene, camera);

      frameId = window.requestAnimationFrame(animate);
    };

    animate();

    const onResize = () => {
      const nextWidth = mount.clientWidth;
      const nextHeight = mount.clientHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    window.addEventListener("resize", onResize);

    return () => {
      sceneDisposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      [scene, numberScene, lightningScene].forEach((disposedScene) => {
        disposedScene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      });
      mount.removeChild(renderer.domElement);
    };
  }, [condition, isNight]);

  // Updates just the digits when the temperature changes (e.g. the 5-minute
  // weather refresh) without rebuilding clouds/lightning/camera along with
  // it - see rebuildNumberRef's declaration above for why this is separate
  // from the condition/isNight effect.
  useEffect(() => {
    rebuildNumberRef.current(numberText);
  }, [numberText]);

  return <div className="weather-scene" ref={mountRef} aria-hidden="true" />;
}
