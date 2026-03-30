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

type ThemeKey = WeatherCondition | "partly-cloudy-night";

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
    orbScale: 0.9,         
    showGlow: true,        
    showRain: false,
    showLightning: false,
    showStars: false,
    cloudOpacity: 0.65,     
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
    orbScale: 0.9,         
    showGlow: true,        
    showRain: false,
    showLightning: false,
    showStars: false,
    cloudOpacity: 0.65,     
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
    orbScale: 0.9,         
    showGlow: true,        
    showRain: false,
    showLightning: false,
    showStars: false,
    cloudOpacity: 0.65,     
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
    orbScale: 0.9,         
    showGlow: true,        
    showRain: false,
    showLightning: false,
    showStars: true,
    cloudOpacity: 0.65,     
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
    orbOpacity: 0.7,           // less visible
    orbScale: 0.38,            // medium size
    showGlow: false,           // ❌ no glow in haze
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
    cloudColor: "#c7d2e4",     // slightly bright grey-blue clouds
    rainColor: "#42bfff",
    // ☀️ Sun almost hidden
    orbColor: "#d4dae5",
    orbOpacity: 0.35,          // barely visible
    orbScale: 0.28,            // small
    showGlow: false,           // ❌ no glow
    showRain: false,
    showLightning: false,
    showStars: false,
    // ☁️ Clouds heavy & dense
    cloudOpacity: 0.95,
    cloudCount: 8,
    // 🌥️ Background darker than haze
    backgroundColor: "#7e97ba",
    // 💡 Lighting (soft but slightly darker)
    ambientIntensity: 0.45,
    keyColor: "#f0f4f9",
    keyIntensity: 0.9,
    fillColor: "#cddedf",
    fillIntensity: 0.32,
    bounceIntensity: 0.2,
    emissiveIntensity: 0.6      // very low (sun hidden)
  },
  rain: {
    cloudColor: "#8f9db5",     // darker clouds
    rainColor: "#4fa8ff",      // slightly brighter rain (visible)

    // 🌙 Sun almost invisible
    orbColor: "#cfd6e2",
    orbOpacity: 0.25,          // more hidden
    orbScale: 0.22,
    showGlow: false,

    showRain: true,
    showLightning: false,
    showStars: false,

    // ☁️ Heavy clouds
    cloudOpacity: 1.0,
    cloudCount: 9,

    // 🌧️ Dark rainy sky
    backgroundColor: "#4f6b8a",

    // 💡 Lighting (darker + moody)
    ambientIntensity: 0.38,
    keyColor: "#cfe3f7",
    keyIntensity: 0.75,
    fillColor: "#9fb7d1",
    fillIntensity: 0.2,
    bounceIntensity: 0.12,

    emissiveIntensity: 0.4
  },
  storm: {
    cloudColor: "#0f141f",     // darker clouds (almost black)
    rainColor: "#5fb3ff",      // brighter rain streaks

    // 🌙 Sun almost gone
    orbColor: "#c9d2e3",
    orbOpacity: 0.15,          // barely visible
    orbScale: 0.22,
    showGlow: false,

    showRain: true,
    showLightning: true,
    showStars: false,

    // ☁️ Heavy storm clouds
    cloudOpacity: 1,
    cloudCount: 10,

    // 🌩️ Deep storm sky
    backgroundColor: "#0a1224",

    // 💡 Lighting (dramatic)
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
    rainColor: "#ffffff",      // ❄️ pure white snow
    showRain: true,

    orbColor: "#f7fbff",
    orbOpacity: 0.5,           // softer sun
    orbScale: 0.22,
    showGlow: false,

    cloudOpacity: 0.98,
    cloudCount: 8,

    backgroundColor: "#eaf4ff",

    ambientIntensity: 0.6,     // brighter snow feel
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
    orbScale: 0.8,        // ☀️ slightly bigger sun
    showGlow: true,

    backgroundColor: "#ff6a3d", // slightly deeper

    ambientIntensity: 0.5,
    keyColor: "#ffd6a3",
    keyIntensity: 1.4,
    fillColor: "#f4bb86",
    fillIntensity: 0.45,
    bounceIntensity: 0.3
  },
 night: {
    cloudColor: "#2f3e5e",     // slightly darker
    orbColor: "#f0f4ff",

    orbOpacity: 0.8,           // 🌙 more visible moon
    orbScale: 0.9,            // bigger moon
    showGlow: true,            // subtle glow add karo

    backgroundColor: "#081a3a", // deeper night

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
  orbScale: 0.6,
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
  
  // 🔥 slight color variation for depth
  const variedColor = new THREE.Color(color).offsetHSL(
    0,
    0,
    (Math.random() - 0.5) * 0.08
  );

  const material = new THREE.MeshPhysicalMaterial({
    color: variedColor,
    roughness: 0.9,
    metalness: 0,
    transmission: 0,
    clearcoat: 0,
    transparent: false,
    opacity: 1
  });

  const puff = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 48, 48), // smoother sphere
    material
  );

  puff.position.set(x, y, z);

  // 🔥 random scaling for organic shape
  puff.scale.set(
    scale,
    scale * (0.8 + Math.random() * 0.1),
    scale * (0.8 + Math.random() * 0.1)
  );

  group.add(puff);
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
        themeKey = "cloudy-night";   // 🔥 NEW
      } else {
        themeKey = "night";
      }
    } else {
      themeKey = condition;
    }

    const theme = sceneThemes[themeKey];
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = null; // keep renderer transparent, no solid background

    // new RGBELoader().load(
    //   "https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr",
    //   (texture) => {
    //     texture.mapping = THREE.EquirectangularReflectionMapping;
    //     scene.environment = texture;
    //   }
    // );
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    camera.position.set(0, 0, 10.8);

    // 🔥 Ambient light
    scene.add(new THREE.AmbientLight("#ffffff", theme.ambientIntensity));

    // 🔥 Main sunlight/moonlight
    const key = new THREE.DirectionalLight(theme.keyColor, theme.keyIntensity);
    key.position.set(-3, 4, 5);
    scene.add(key);

    // 🔥 Fill light
    const fill = new THREE.DirectionalLight(theme.fillColor, theme.fillIntensity);
    fill.position.set(3, 2, 4);
    scene.add(fill);

    // 🔥 Bottom bounce
    const bounce = new THREE.DirectionalLight("#ffffff", theme.bounceIntensity);
    bounce.position.set(0, -3, 2);
    scene.add(bounce);

    const cloud = new THREE.Group();
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
    let [x, y, z, scale] = baseCloudPositions[index];

    const jitterX = x + (Math.random() - 0.5) * 0.18;
    const jitterY = y - 0.2 + (Math.random() - 0.5) * 0.12;
    const jitterScale = scale * (0.85 + Math.random() * 0.2);

    // 🔥 MAGIC: half clouds back, half front
    const isFront = i % 2 === 0;

    // 🔥 shift front clouds sideways (moon cover na kare)
    const offsetX = isFront ? (Math.random() > 0.5 ? 0.6 : -0.6) : 0;

    const finalZ = isFront ? 0.3 : -0.4;

    addCloudPuff(
      cloud,
      theme.cloudColor,
      jitterX + offsetX,
      jitterY,
      finalZ,
      jitterScale,
      theme.cloudOpacity
    );
  }

    const underShadow = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 32, 32),
      new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.22 * theme.cloudOpacity })
    );
    underShadow.position.set(0.2, 0.15, -0.6);
    underShadow.scale.set(1.4, 0.25, 0.9);
    cloud.add(underShadow);
    scene.add(cloud);

    const orb = new THREE.Mesh(
    new THREE.SphereGeometry(theme.orbScale, 48, 48),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.orbColor),
      emissive: new THREE.Color(theme.orbColor),
      emissiveIntensity: theme.emissiveIntensity || 1.4,   // 🔥 glow
      roughness: 0.4,
      metalness: 0,
      transparent: true,
      opacity: theme.orbOpacity
    })
    );
      orb.position.set(0, 1.35, -0.2);
    scene.add(orb);

    if (theme.showGlow) {
      const glowGeometry = new THREE.SphereGeometry(theme.orbScale * 1.3, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
      color: theme.orbColor,   // ✅ same as sun/moon
      transparent: true,
      opacity: 0.15,           // thoda increase for nice glow
      depthWrite: false
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.set(0, 1.35, -0.2);
      scene.add(glowMesh);
    }

    const starGroup = new THREE.Group();
    if (theme.showStars) {
      for (let index = 0; index < 7; index += 1) {
        const star = new THREE.Mesh(
          new THREE.SphereGeometry(0.04 + Math.random() * 0.018, 12, 12),
          new THREE.MeshBasicMaterial({ color: theme.orbColor === "#f7f9ff" ? "#ffe" : "#ffd76a" })
        );
        const spreadX = -2 + Math.random() * 4;
        const spreadY = 1.2 + Math.random() * 1.4; // bigger vertical spread

        star.position.set(spreadX, spreadY, -0.3);
        starGroup.add(star);
      }
    }
    scene.add(starGroup);

    const rainGroup = new THREE.Group();
    if (theme.showRain) {
      for (let index = 0; index < 14; index += 1) {
        const drop = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.56 + Math.random() * 0.28, 0.02),
          new THREE.MeshBasicMaterial({ color: theme.rainColor })
        );
        drop.position.set((Math.random() - 0.5) * 4.2, 1.1 + Math.random() * 2.1, (Math.random() - 0.5) * 0.6);
        drop.rotation.z = 0.16;
        rainGroup.add(drop);
      }
    }
    scene.add(rainGroup);

    const lightning = new THREE.Group();
    const lightningMat = new THREE.MeshBasicMaterial({ color: "#8f1d1d", transparent: true, opacity: 0 });
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.02), lightningMat);
    l1.position.set(0.42, 1.2, 0.3);
    l1.rotation.z = 0.62;
    lightning.add(l1);
    const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.56, 0.02), lightningMat);
    l2.position.set(0.62, 0.86, 0.3);
    l2.rotation.z = -0.68;
    lightning.add(l2);
    scene.add(lightning);

    const clock = new THREE.Clock();
    let frameId = 0;
    let lightningTimer = 0;
    let isFlashing = false;

    const flashColor = new THREE.Color("#1a2a4f");

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      cloud.position.y = Math.sin(elapsed * 0.85) * 0.015;
      orb.position.y = 1.08 + Math.sin(elapsed * 1.4) * 0.025;

      rainGroup.children.forEach((drop, index) => {
        drop.position.y -= 0.1 + (index % 3) * 0.01;
        if (drop.position.y < -1.6) {
          drop.position.y = 3.2;
        }
      });

      if (theme.showLightning) {
        lightningTimer -= delta;

        if (lightningTimer <= 0) {
          if (Math.random() > 0.96) {
            isFlashing = true;
            lightningTimer = 0.12;
          } else {
            isFlashing = false;
            lightningTimer = 1 + Math.random() * 2;
          }
        }

        // 🔥 smooth lightning fade
        if (isFlashing) {
          lightningMat.opacity = Math.min(1, lightningMat.opacity + 0.25);
          scene.background = flashColor;
        } else {
          lightningMat.opacity *= 0.85;
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


