// @ts-nocheck
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import type { WeatherCondition } from "../types";

interface WeatherSceneProps {
  condition: WeatherCondition;
  temperature: number;
  isNight?: boolean;
}

type ThemeKey = WeatherCondition | "partly-cloudy-night" | "cloudy-night" | "rainy-night";

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
    orbColor: "#f2b844",
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
    orbColor: "#f2b844",
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
    orbColor: "#f2b844",
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
    orbColor: "#f5f7ff" ,
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
    emissiveIntensity: 2.2
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
    showLightning: false,
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
    showLightning: false,
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
    cloudColor: "#2f3e5e",     // Slightly darker cloud tone.
    orbColor: "#f0f4ff",

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
    cloudCount: 5,
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


export function WeatherScene({ condition, isNight }: WeatherSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);



  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    let themeKey: ThemeKey;

    if (isNight) {
      if (condition === "partly-cloudy") {
        themeKey = "partly-cloudy-night";
      } else if (condition === "cloudy") {
        themeKey = "cloudy-night";
      } else if (condition === "rain") {
        themeKey = "rainy-night";
      } else if (condition === "storm") {
        themeKey = "storm";
      } else {
        themeKey = "night";
      }
    } else {
      themeKey = condition;   // Use the daytime theme directly.
    }

    const baseTheme = sceneThemes[themeKey];
    const isHiddenOrbScene =
      themeKey === "cloudy" ||
      themeKey === "cloudy-night" ||
      (isNight && (themeKey === "rainy-night" || themeKey === "storm"));
    const theme = {
      ...baseTheme,
      showGlow: isHiddenOrbScene ? false : true,
      orbScale: isHiddenOrbScene
        ? 0
        : isNight
        ? Math.max(baseTheme.orbScale, 1.05)
        : Math.max(baseTheme.orbScale, 0.95),
      orbOpacity: isHiddenOrbScene
        ? 0
        : isNight
        ? 1
        : 1,
      emissiveIntensity: isHiddenOrbScene
        ? 0
        : Math.max((baseTheme as any).emissiveIntensity ?? 1.4, isNight ? 1.9 : 1.6)
    };
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = null; // Keep the renderer background transparent.

    // new RGBELoader().load(
    //   "https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr",
    //   (texture) => {
    //     texture.mapping = THREE.EquirectangularReflectionMapping;
    //     scene.environment = texture;
    //   }
    // );
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    camera.position.set(0, 0, 10.8);

    // Base ambient light.
    scene.add(new THREE.AmbientLight("#ffffff", theme.ambientIntensity));

    // Primary directional light for the sun or moon.
    const key = new THREE.DirectionalLight(theme.keyColor, theme.keyIntensity);
    key.position.set(-3, 4, 5);
    scene.add(key);

    // Secondary fill light.
    const fill = new THREE.DirectionalLight(theme.fillColor, theme.fillIntensity);
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
    const isClearBirdScene = !isNight && (condition === "clear" || condition === "mostly-sunny");
    const cloudVerticalOffset =
      themeKey === "cloudy" ||
      themeKey === "cloudy-night" ||
      themeKey === "rain" ||
      themeKey === "rainy-night" ||
      themeKey === "storm"
        ? 0.6
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
      driftSpeed: isDenseCloudScene ? 0.004 + Math.random() * 0.008 : 0.035 + Math.random() * 0.04 + (isFront ? 0.015 : 0),
      driftSpan: isDenseCloudScene ? 0.45 + Math.random() * 0.5 : 5.8 + Math.random() * 1.8,
      bobAmp: isDenseCloudScene ? 0.008 + Math.random() * 0.012 : 0.018 + Math.random() * 0.03,
      bobSpeed: isDenseCloudScene ? 0.12 + Math.random() * 0.12 : 0.28 + Math.random() * 0.32,
      bobPhase: Math.random() * Math.PI * 2,
      swayAmp: isDenseCloudScene ? 0.015 + Math.random() * 0.025 : 0.08 + Math.random() * 0.12 + (isFront ? 0.04 : 0),
      swaySpeed: isDenseCloudScene ? 0.08 + Math.random() * 0.08 : 0.16 + Math.random() * 0.2,
      swayPhase: Math.random() * Math.PI * 2,
      rollAmp: isDenseCloudScene ? 0.004 + Math.random() * 0.01 : 0.02 + Math.random() * 0.03,
      rollSpeed: isDenseCloudScene ? 0.05 + Math.random() * 0.06 : 0.14 + Math.random() * 0.12,
      scalePulseAmp: isDenseCloudScene ? 0.04 + Math.random() * 0.03 : 0.018 + Math.random() * 0.018,
      scalePulseSpeed: isDenseCloudScene ? 0.09 + Math.random() * 0.08 : 0.18 + Math.random() * 0.14,
      scalePulsePhase: Math.random() * Math.PI * 2,
      highlightPhase: Math.random() * Math.PI * 2,
      initialScale: puff.scale.clone()
    });

  }


    const underShadow = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 32, 32),
      new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.22 * theme.cloudOpacity })
    );
    underShadow.position.set(0.08, -1.75, -0.9);
    underShadow.scale.set(1.55, 0.29, 0.9);
    cloud.add(underShadow);
    scene.add(cloud);

    const orb = !isHiddenOrbScene ? new THREE.Mesh(
    new THREE.CircleGeometry(theme.orbScale, 48),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.orbColor),
      emissive: new THREE.Color(theme.orbColor),
      emissiveIntensity: theme.emissiveIntensity || 1.4,   // Control orb glow strength.
      roughness: 0.4,
      metalness: 0,
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
      glowMesh.scale.set(1, 1.08, 1);
      glowMesh.renderOrder = -1;
      scene.add(glowMesh);
    }

    const starGroup = new THREE.Group();
    const starMotions: StarMotion[] = [];
    if (theme.showStars) {
      for (let index = 0; index < 7; index += 1) {
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
    if (theme.showRain) {
      for (let index = 0; index < 18; index += 1) {
        const anchor = cloudMotions[index % Math.max(cloudMotions.length, 1)];
        const length = 0.38 + Math.random() * 0.24;
        const drop = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, length, 0.02),
          new THREE.MeshBasicMaterial({ color: theme.rainColor })
        );
        drop.position.set((Math.random() - 0.5) * 4.2, 1.1 + Math.random() * 2.1, (Math.random() - 0.5) * 0.6);
        drop.rotation.z = 0.16;
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
    lightning.renderOrder = 6;
    scene.add(lightning);

    const clock = new THREE.Clock();
    let frameId = 0;
    let lightningTimer = 0;
    let isFlashing = false;

    const flashColor = new THREE.Color("#1a2a4f");

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      cloud.position.x = isDenseCloudScene ? Math.sin(elapsed * 0.04) * 0.012 : Math.sin(elapsed * 0.08) * 0.05;
      cloud.position.y = isDenseCloudScene ? Math.sin(elapsed * 0.08) * 0.01 : Math.sin(elapsed * 0.22) * 0.025;
      cloud.rotation.z = isDenseCloudScene ? Math.sin(elapsed * 0.05) * 0.004 : Math.sin(elapsed * 0.11) * 0.015;

      if (orb) {
        orb.position.y = 1.08 + Math.sin(elapsed * 1.4) * 0.025;
      }

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
          if (Math.random() > 0.9) {
            isFlashing = true;
            lightningTimer = 0.16;
          } else {
            isFlashing = false;
            lightningTimer = 0.65 + Math.random() * 1.35;
          }
        }

        // Fade lightning intensity in and out smoothly.
        if (isFlashing) {
          lightningMat.opacity = Math.min(1, lightningMat.opacity + 0.4);
          lightningGlowMat.opacity = Math.min(0.55, lightningGlowMat.opacity + 0.22);
          scene.background = flashColor;
        } else {
          lightningMat.opacity *= 0.85;
          lightningGlowMat.opacity *= 0.78;
          scene.background = null;
        }
      }

      renderer.render(scene, camera);
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
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, [condition, isNight]);

  return <div className="weather-scene" ref={mountRef} aria-hidden="true" />;
}
