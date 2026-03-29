// @ts-nocheck
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import type { WeatherCondition } from "../types";

interface WeatherSceneProps {
  condition: WeatherCondition;
  temperature: number;
}

const sceneThemes: Record<
  WeatherCondition,
  {
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
  }
> = {
  clear: {
    cloudColor: "#f3f6fb",
    rainColor: "#42bfff",
    orbColor: "#ffeb3b",
    showRain: false,
    showLightning: false,
    showStars: false,
    orbOpacity: 1,
    cloudOpacity: 0.95,
    orbScale: 0.5,
    showGlow: true
  },
  "mostly-sunny": {
    cloudColor: "#f7f7f2",
    rainColor: "#42bfff",
    orbColor: "#ffd84a",
    showRain: false,
    showLightning: false,
    showStars: false,
    orbOpacity: 1,
    cloudOpacity: 0.65,
    orbScale: 0.45,
    showGlow: true
  },
  "partly-cloudy": {
    cloudColor: "#f1f4f8",
    rainColor: "#42bfff",
    orbColor: "#f7f3e5",
    showRain: false,
    showLightning: false,
    showStars: false,
    orbOpacity: 0.78,
    cloudOpacity: 0.8,
    orbScale: 0.35,
    showGlow: false
  },
  haze: {
    cloudColor: "#d8d8d8",
    rainColor: "#93b6c9",
    orbColor: "#f8e69f",
    showRain: false,
    showLightning: false,
    showStars: false,
    orbOpacity: 0.88,
    cloudOpacity: 0.82,
    orbScale: 0.4,
    showGlow: false
  },
  cloudy: {
    cloudColor: "#f3f6fb",
    rainColor: "#42bfff",
    orbColor: "#d4dae5",
    showRain: false,
    showLightning: false,
    showStars: false,
    orbOpacity: 0.75,
    cloudOpacity: 0.98,
    orbScale: 0.24,
    showGlow: false
  },
  rain: {
    cloudColor: "#f3f6fb",
    rainColor: "#42bfff",
    orbColor: "#d4dae5",
    showRain: true,
    showLightning: false,
    showStars: false,
    orbOpacity: 0.5,
    cloudOpacity: 0.96,
    orbScale: 0.24,
    showGlow: false
  },
  storm: {
    cloudColor: "#191c22",
    rainColor: "#42bfff",
    orbColor: "#d4dae5",
    showRain: true,
    showLightning: true,
    showStars: false,
    orbOpacity: 0.4,
    cloudOpacity: 1,
    orbScale: 0.24,
    showGlow: false
  },
  snow: {
    cloudColor: "#f5f8fd",
    rainColor: "#d7ebff",
    orbColor: "#f7fbff",
    showRain: true,
    showLightning: false,
    showStars: false,
    orbOpacity: 0.6,
    cloudOpacity: 0.97,
    orbScale: 0.24,
    showGlow: false
  },
  sunset: {
    cloudColor: "#f7e7dc",
    rainColor: "#42bfff",
    orbColor: "#ff9f54",
    showRain: false,
    showLightning: false,
    showStars: false,
    orbOpacity: 1,
    cloudOpacity: 0.92,
    orbScale: 0.42,
    showGlow: true
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
export function WeatherScene({ condition }: WeatherSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const theme = sceneThemes[condition];
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

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
    scene.add(new THREE.AmbientLight("#ffffff", 0.6));

    // 🔥 Main sunlight
    const key = new THREE.DirectionalLight("#fff5cc", 1.4);
    key.position.set(-3, 4, 5);
    scene.add(key);

    // 🔥 Fill light
    const fill = new THREE.DirectionalLight("#cfe8ff", 0.6);
    fill.position.set(3, 2, 4);
    scene.add(fill);

    // 🔥 Bottom bounce
    const bounce = new THREE.DirectionalLight("#ffffff", 0.3);
    bounce.position.set(0, -3, 2);
    scene.add(bounce);

    const cloud = new THREE.Group();
    addCloudPuff(cloud, theme.cloudColor, -1.4, 0.95, 0.1, 0.9, theme.cloudOpacity);
    addCloudPuff(cloud, theme.cloudColor, -0.7, 1.18, 0.15, 1.02, theme.cloudOpacity);
    addCloudPuff(cloud, theme.cloudColor, 0.06, 1.24, 0.2, 1.22, theme.cloudOpacity);
    addCloudPuff(cloud, theme.cloudColor, 0.92, 1.1, 0.18, 1.04, theme.cloudOpacity);
    addCloudPuff(cloud, theme.cloudColor, 1.6, 0.9, 0.1, 0.86, theme.cloudOpacity);
    addCloudPuff(cloud, theme.cloudColor, -0.16, 0.65, -0.08, 1.36, theme.cloudOpacity);
    addCloudPuff(cloud, theme.cloudColor, 0.86, 0.65, -0.05, 1, theme.cloudOpacity);

    const underShadow = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 32, 32),
      new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.08 * theme.cloudOpacity })
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
      emissiveIntensity: 1.4,   // 🔥 glow
      roughness: 0.4,
      metalness: 0,
      transparent: true,
      opacity: theme.orbOpacity
    })
    );
      orb.position.set(-1.52, 1.08, -0.55);
    scene.add(orb);

    if (theme.showGlow) {
      const glowGeometry = new THREE.SphereGeometry(theme.orbScale * 1.3, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: "#000000",
        transparent: true,
        opacity: 0.06,
        depthWrite: false   // 🔥 important (prevents heavy overlap look)
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.set(-1.52, 1.08, -0.55);
      scene.add(glowMesh);
    }

    const starGroup = new THREE.Group();
    if (theme.showStars) {
      for (let index = 0; index < 6; index += 1) {
        const star = new THREE.Mesh(
          new THREE.SphereGeometry(0.05 + Math.random() * 0.02, 12, 12),
          new THREE.MeshBasicMaterial({ color: "#181a1f" })
        );
        star.position.set(-2 + Math.random() * 4, 2.7 + Math.random() * 0.8, -0.3);
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

    const animate = () => {
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
        const flash = Math.max(0, Math.sin(elapsed * 5.2)) ** 18;
        lightningMat.opacity = flash;
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
  }, [condition]);

  return <div className="weather-scene" ref={mountRef} aria-hidden="true" />;
}


