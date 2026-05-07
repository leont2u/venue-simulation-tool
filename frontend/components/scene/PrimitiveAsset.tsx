"use client";

import { Suspense, memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  url: string;
  type?: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  selected?: boolean;
  hovered?: boolean;
  color?: string;
  material?: {
    roughness: number;
    metalness: number;
  };
  onClick?: (event: { shiftKey: boolean }) => void;
  onPointerDown?: (event: {
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    ray: THREE.Ray;
    point: THREE.Vector3;
    stopPropagation: () => void;
    target: EventTarget;
    pointerId: number;
    clientX: number;
    clientY: number;
  }) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
};

function PrimitiveAssetComponent({
  url,
  type,
  position,
  rotation,
  scale,
  selected,
  hovered,
  color,
  material,
  onClick,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: Props) {
  if (url.startsWith("/models/")) {
    return (
      <Suspense fallback={<LoadingPlaceholder type={type} position={position} rotation={rotation} scale={scale} />}>
        <GltfAsset
          url={url}
          position={position}
          rotation={rotation}
          scale={scale}
          selected={selected}
          hovered={hovered}
          color={color}
          material={material}
          onClick={onClick}
          onPointerDown={onPointerDown}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
        />
      </Suspense>
    );
  }

  if (url.startsWith("poly-pizza://required/")) {
    const venueType = url.replace("poly-pizza://required/", "");
    return (
      <GeneratedVenueAsset
        type={venueType}
        position={position}
        rotation={rotation}
        scale={scale}
        selected={selected}
        hovered={hovered}
        color={color}
        material={material}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      />
    );
  }

  if (url.startsWith("primitive://")) {
    return (
      <PrimitiveShape
        type={url.replace("primitive://", "")}
        position={position}
        rotation={rotation}
        scale={scale}
        selected={selected}
        hovered={hovered}
        color={color}
        material={material}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingPlaceholder type={type} position={position} rotation={rotation} scale={scale} />}>
      <GltfAsset
        url={url}
        position={position}
        rotation={rotation}
        scale={scale}
        selected={selected}
        hovered={hovered}
        color={color}
        material={material}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      />
    </Suspense>
  );
}

function SelectionRing({
  position,
  color = "#49d24d",
}: {
  position: [number, number, number];
  color?: string;
}) {
  return (
    <mesh
      position={[position[0], position[1] + 0.05, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.55, 0.78, 40]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function LocalSelectionRing({ color = "#49d24d" }: { color?: string }) {
  return (
    <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.55, 0.78, 40]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function PulsingRing({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.3 + 0.5 * Math.abs(Math.sin(clock.elapsedTime * 2.5));
  });
  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1] + 0.05, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.55, 0.78, 40]} />
      <meshBasicMaterial color="#5da0d0" transparent opacity={0.5} />
    </mesh>
  );
}

function LoadingPlaceholder({
  type,
  position,
  rotation,
  scale,
}: {
  type?: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}) {
  return (
    <group>
      <GeneratedVenueAsset
        type={type || "chair"}
        position={position}
        rotation={rotation}
        scale={scale}
      />
      <PulsingRing position={position} />
    </group>
  );
}

function HitBox({
  size,
  onPointerDown,
}: {
  size: [number, number, number];
  onPointerDown?: Props["onPointerDown"];
}) {
  const hitMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  return (
    <mesh
      position={[0, size[1] / 2, 0]}
      material={hitMaterial}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown?.({
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          ray: event.ray.clone(),
          point: event.point.clone(),
          stopPropagation: event.stopPropagation,
          target: (event.target ?? event.currentTarget) as EventTarget,
          pointerId: event.pointerId,
          clientX: event.nativeEvent.clientX,
          clientY: event.nativeEvent.clientY,
        });
      }}
    >
      <boxGeometry args={size} />
    </mesh>
  );
}

function applySceneMaterial(
  root: THREE.Object3D,
  color?: string,
  materialConfig?: { roughness: number; metalness: number },
) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const sourceMaterial = Array.isArray(mesh.material)
      ? mesh.material[0]
      : mesh.material;

    const nextMaterial =
      sourceMaterial instanceof THREE.MeshStandardMaterial
        ? sourceMaterial.clone()
        : new THREE.MeshStandardMaterial();

    if (color) {
      nextMaterial.color = new THREE.Color(color);
    }

    nextMaterial.roughness = materialConfig?.roughness ?? nextMaterial.roughness;
    nextMaterial.metalness = materialConfig?.metalness ?? nextMaterial.metalness;
    mesh.material = nextMaterial;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

function GltfAsset({
  url,
  position,
  rotation,
  scale,
  selected,
  hovered,
  color,
  material,
  onClick,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: Props) {
  const { scene } = useGLTF(url);

  const normalizedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.updateMatrixWorld(true);

    let box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
    cloned.scale.setScalar(1 / maxDimension);
    cloned.updateMatrixWorld(true);

    box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    box.getCenter(center);

    cloned.position.x -= center.x;
    cloned.position.z -= center.z;
    cloned.position.y -= box.min.y;

    applySceneMaterial(cloned, color, material);

    const wrapper = new THREE.Group();
    wrapper.add(cloned);
    return wrapper;
  }, [scene, color, material]);

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onClick?.({ shiftKey: event.shiftKey });
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown?.({
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          ray: event.ray.clone(),
          point: event.point.clone(),
          stopPropagation: event.stopPropagation,
          target: (event.target ?? event.currentTarget) as EventTarget,
          pointerId: event.pointerId,
          clientX: event.nativeEvent.clientX,
          clientY: event.nativeEvent.clientY,
        });
      }}
      onPointerEnter={(event) => {
        event.stopPropagation();
        onPointerEnter?.();
      }}
      onPointerLeave={(event) => {
        event.stopPropagation();
        onPointerLeave?.();
      }}
    >
      <HitBox
        size={[
          Math.max(0.9, scale[0] * 1.35),
          Math.max(0.9, scale[1] * 1.35),
          Math.max(0.9, scale[2] * 1.35),
        ]}
        onPointerDown={onPointerDown}
      />
      <primitive
        object={normalizedScene}
        position={position}
        rotation={rotation}
        scale={scale}
      />

      {selected ? (
        <SelectionRing position={position} color="#4D96FF" />
      ) : hovered ? (
        <SelectionRing position={position} color="#9CC9FF" />
      ) : null}
    </group>
  );
}

type PrimitiveShapeProps = Omit<Props, "url"> & {
  type: string;
};

function PrimitiveShape({
  type,
  position,
  rotation,
  scale,
  selected,
  hovered,
  color,
  material,
  onClick,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: PrimitiveShapeProps) {
  const geometry = useMemo(() => {
    if (
      type === "round_table" ||
      type === "plant" ||
      type === "column" ||
      type === "ceiling_light"
    ) {
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
    }

    if (type === "pendant_fan") {
      return new THREE.CylinderGeometry(0.5, 0.5, 0.08, 32);
    }

    if (type === "speaker") {
      return new THREE.BoxGeometry(0.7, 1.2, 0.7);
    }

    if (type === "mixing_desk") {
      return new THREE.BoxGeometry(1.2, 0.45, 0.8);
    }

    return new THREE.BoxGeometry(1, 1, 1);
  }, [type]);

  const meshMaterial = useMemo(() => {
    const colorMap: Record<string, string> = {
      round_table: "#d8c3a5",
      rectangular_table: "#c9ada7",
      stage: "#6d6875",
      dance_floor: "#d4a373",
      aisle: "#e9edc9",
      sofa: "#84a98c",
      bar: "#9c6644",
      plant: "#6a994e",
      wall: "#d9d3c7",
      door: "#7b5a43",
      window: "#8fb8c8",
      column: "#777d7d",
      ceiling_light: "#fff7d7",
      ceiling_cove: "#9ec7ff",
      pendant_fan: "#8b5e35",
      railing: "#6f7775",
      entrance: "#52796f",
      speaker: "#ba7517",
      mixing_desk: "#534ab7",
    };

    return new THREE.MeshStandardMaterial({
      color: color || colorMap[type] || "#adb5bd",
      roughness: material?.roughness ?? 0.72,
      metalness: material?.metalness ?? 0.08,
    });
  }, [color, material, type]);

  const yOffset = scale[1] / 2;

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.({ shiftKey: event.shiftKey });
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown?.({
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          ray: event.ray.clone(),
          point: event.point.clone(),
          stopPropagation: event.stopPropagation,
          target: (event.target ?? event.currentTarget) as EventTarget,
          pointerId: event.pointerId,
          clientX: event.nativeEvent.clientX,
          clientY: event.nativeEvent.clientY,
        });
      }}
      onPointerEnter={(event) => {
        event.stopPropagation();
        onPointerEnter?.();
      }}
      onPointerLeave={(event) => {
        event.stopPropagation();
        onPointerLeave?.();
      }}
    >
      <HitBox
        size={[
          Math.max(0.9, scale[0] * 1.25),
          Math.max(0.9, scale[1] * 1.25),
          Math.max(0.9, scale[2] * 1.25),
        ]}
        onPointerDown={onPointerDown}
      />
      <mesh
        position={[0, yOffset, 0]}
        scale={scale}
        geometry={geometry}
        material={meshMaterial}
        castShadow
        receiveShadow
      />

      {selected ? (
        <LocalSelectionRing color="#4D96FF" />
      ) : hovered ? (
        <LocalSelectionRing color="#9CC9FF" />
      ) : null}
    </group>
  );
}

function GeneratedVenueAsset({
  type,
  position,
  rotation,
  scale,
  selected,
  hovered,
  color,
  material,
  onClick,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: PrimitiveShapeProps) {
  const fabricTexture = useMemo(() => {
    if (typeof document === "undefined") return null;

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#efe3d7";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 10) {
      ctx.strokeStyle = y % 20 === 0 ? "rgba(255,255,255,0.16)" : "rgba(120,92,74,0.06)";
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y + 4);
      ctx.stroke();
    }
    for (let x = 0; x < 256; x += 14) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 6, 256);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }, []);

  const palette = useMemo(() => {
    const colorMap: Record<string, string> = {
      chair: "#8fb19d",
      church_bench: "#8a6a4e",
      altar: "#d8d0c2",
      podium: "#8a5e3f",
      piano: "#1e2329",
      camera: "#2f5f7c",
      screen: "#243247",
      tv: "#243247",
      desk: "#b28a61",
      banquet_table: "#d8c3a5",
      speaker: "#30343b",
      mixing_desk: "#343a55",
    };

    return {
      body: color || colorMap[type] || "#9aa6a0",
      dark: "#2f3532",
      cloth: "#efe7dc",
      brass: "#c1a158",
    };
  }, [color, type]);

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: palette.body,
        roughness: material?.roughness ?? 0.68,
        metalness: material?.metalness ?? 0.05,
      }),
    [material?.metalness, material?.roughness, palette.body],
  );
  const darkMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: palette.dark,
        roughness: 0.48,
        metalness: 0.18,
      }),
    [palette.dark],
  );
  const clothMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: palette.cloth,
        map: fabricTexture ?? undefined,
        roughness: 0.92,
        metalness: 0.01,
      }),
    [fabricTexture, palette.cloth],
  );
  const visualScale = useMemo<[number, number, number]>(() => {
    const legacyTinyModelScale = ["podium", "banquet_table", "tv"].includes(type);
    if (legacyTinyModelScale && Math.max(...scale) <= 0.2) return [1, 1, 1];
    return scale;
  }, [scale, type]);

  const child = useMemo(() => {
    if (type === "chair") {
      return (
        <>
          <mesh position={[0, 0.32, 0]} castShadow receiveShadow material={bodyMaterial}>
            <boxGeometry args={[0.55, 0.12, 0.52]} />
          </mesh>
          <mesh position={[0, 0.68, 0.22]} castShadow receiveShadow material={bodyMaterial}>
            <boxGeometry args={[0.58, 0.72, 0.1]} />
          </mesh>
          {[-0.2, 0.2].map((x) =>
            [-0.18, 0.18].map((z) => (
              <mesh key={`${x}-${z}`} position={[x, 0.15, z]} castShadow receiveShadow material={darkMaterial}>
                <cylinderGeometry args={[0.035, 0.035, 0.3, 10]} />
              </mesh>
            )),
          )}
        </>
      );
    }

    if (type === "church_bench") {
      return (
        <>
          <mesh position={[0, 0.36, 0]} castShadow receiveShadow material={bodyMaterial}>
            <boxGeometry args={[2.2, 0.14, 0.62]} />
          </mesh>
          <mesh position={[0, 0.82, 0.27]} castShadow receiveShadow material={bodyMaterial}>
            <boxGeometry args={[2.3, 0.82, 0.12]} />
          </mesh>
          {[-0.85, 0, 0.85].map((x) => (
            <mesh key={x} position={[x, 0.18, -0.12]} castShadow receiveShadow material={darkMaterial}>
              <boxGeometry args={[0.08, 0.36, 0.18]} />
            </mesh>
          ))}
        </>
      );
    }

    if (type === "altar") {
      return (
        <>
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow material={clothMaterial}>
            <boxGeometry args={[2.5, 0.9, 1.1]} />
          </mesh>
          <mesh position={[0, 0.98, -0.08]} castShadow receiveShadow material={bodyMaterial}>
            <boxGeometry args={[2.1, 0.18, 0.82]} />
          </mesh>
          <mesh position={[0, 1.35, 0]} castShadow receiveShadow material={bodyMaterial}>
            <boxGeometry args={[0.08, 0.6, 0.08]} />
          </mesh>
          <mesh position={[0, 1.62, 0]} castShadow receiveShadow material={bodyMaterial}>
            <boxGeometry args={[0.52, 0.08, 0.08]} />
          </mesh>
        </>
      );
    }

    if (type === "podium") {
      return (
        <>
          <mesh position={[0, 0.55, 0]} castShadow receiveShadow material={bodyMaterial}>
            <boxGeometry args={[0.8, 1.1, 0.58]} />
          </mesh>
          <mesh position={[0, 1.15, -0.08]} castShadow receiveShadow material={bodyMaterial}>
            <boxGeometry args={[0.9, 0.12, 0.68]} />
          </mesh>
          <mesh position={[0.28, 1.32, -0.18]} castShadow receiveShadow material={darkMaterial}>
            <cylinderGeometry args={[0.018, 0.018, 0.38, 8]} />
          </mesh>
        </>
      );
    }

    if (type === "piano") {
      return (
        <>
          <mesh position={[0, 0.55, 0]} castShadow receiveShadow material={darkMaterial}>
            <boxGeometry args={[1.8, 0.55, 1.22]} />
          </mesh>
          <mesh position={[0.26, 0.93, -0.08]} rotation={[0, 0, -0.16]} castShadow receiveShadow material={darkMaterial}>
            <boxGeometry args={[1.45, 0.08, 1.1]} />
          </mesh>
          <mesh position={[0, 0.86, -0.68]} castShadow receiveShadow material={clothMaterial}>
            <boxGeometry args={[1.25, 0.06, 0.18]} />
          </mesh>
        </>
      );
    }

    if (type === "camera") {
      return (
        <>
          <mesh position={[0, 1.12, 0]} castShadow receiveShadow material={darkMaterial}>
            <boxGeometry args={[0.46, 0.32, 0.36]} />
          </mesh>
          <mesh position={[0, 1.12, -0.28]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow material={darkMaterial}>
            <cylinderGeometry args={[0.13, 0.16, 0.28, 18]} />
          </mesh>
          <mesh position={[0, 0.58, 0]} castShadow receiveShadow material={bodyMaterial}>
            <cylinderGeometry args={[0.035, 0.035, 1.05, 10]} />
          </mesh>
          <mesh position={[0, 0.06, 0]} castShadow receiveShadow material={darkMaterial}>
            <cylinderGeometry args={[0.34, 0.34, 0.06, 3]} />
          </mesh>
        </>
      );
    }

    if (type === "screen" || type === "tv") {
      return (
        <>
          <mesh position={[0, 1.18, 0]} castShadow receiveShadow material={darkMaterial}>
            <boxGeometry args={[3.1, 1.78, 0.12]} />
          </mesh>
          <mesh position={[0, 1.18, -0.07]} receiveShadow>
            <boxGeometry args={[2.82, 1.48, 0.035]} />
            <meshStandardMaterial color="#263f6a" emissive="#31548f" emissiveIntensity={0.55} roughness={0.22} metalness={0.12} />
          </mesh>
          <mesh position={[0, 0.3, 0.08]} castShadow receiveShadow material={darkMaterial}>
            <boxGeometry args={[0.16, 0.6, 0.16]} />
          </mesh>
        </>
      );
    }

    if (type === "banquet_table") {
      return (
        <>
          <mesh position={[0, 0.48, 0]} castShadow receiveShadow material={clothMaterial}>
            <cylinderGeometry args={[0.9, 0.95, 0.22, 36]} />
          </mesh>
          <mesh position={[0, 0.66, 0]} castShadow receiveShadow material={bodyMaterial}>
            <cylinderGeometry args={[0.22, 0.16, 0.18, 24]} />
          </mesh>
          <mesh position={[0, 0.8, 0]} castShadow receiveShadow material={bodyMaterial}>
            <sphereGeometry args={[0.18, 16, 16]} />
          </mesh>
        </>
      );
    }

    if (type === "round_table") {
      return (
        <>
          <mesh position={[0, 0.43, 0]} castShadow receiveShadow material={clothMaterial}>
            <cylinderGeometry args={[0.94, 1.0, 0.12, 36]} />
          </mesh>
          <mesh position={[0, 0.36, 0]} castShadow receiveShadow material={clothMaterial}>
            <cylinderGeometry args={[1.0, 1.04, 0.18, 36, 1, true]} />
          </mesh>
          <mesh position={[0, 0.69, 0]} castShadow receiveShadow material={bodyMaterial}>
            <cylinderGeometry args={[0.13, 0.18, 0.44, 18]} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow receiveShadow material={darkMaterial}>
            <cylinderGeometry args={[0.4, 0.12, 0.08, 18]} />
          </mesh>
        </>
      );
    }

    if (type === "rectangular_table") {
      return (
        <>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow material={clothMaterial}>
            <boxGeometry args={[1.9, 0.12, 0.86]} />
          </mesh>
          <mesh position={[0, 0.34, 0]} castShadow receiveShadow material={clothMaterial}>
            <boxGeometry args={[1.98, 0.16, 0.94]} />
          </mesh>
          {[-0.72, 0.72].map((x) =>
            [-0.24, 0.24].map((z) => (
              <mesh key={`${x}-${z}`} position={[x, 0.2, z]} castShadow receiveShadow material={darkMaterial}>
                <cylinderGeometry args={[0.04, 0.05, 0.4, 10]} />
              </mesh>
            )),
          )}
        </>
      );
    }

    return (
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow material={bodyMaterial}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    );
  }, [bodyMaterial, clothMaterial, darkMaterial, type]);

  return (
    <group
      position={position}
      rotation={rotation}
      scale={visualScale}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.({ shiftKey: event.shiftKey });
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown?.({
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          ray: event.ray.clone(),
          point: event.point.clone(),
          stopPropagation: event.stopPropagation,
          target: (event.target ?? event.currentTarget) as EventTarget,
          pointerId: event.pointerId,
          clientX: event.nativeEvent.clientX,
          clientY: event.nativeEvent.clientY,
        });
      }}
      onPointerEnter={(event) => {
        event.stopPropagation();
        onPointerEnter?.();
      }}
      onPointerLeave={(event) => {
        event.stopPropagation();
        onPointerLeave?.();
      }}
    >
      <HitBox size={[1.35, 1.35, 1.35]} onPointerDown={onPointerDown} />
      {child}
      {selected ? (
        <LocalSelectionRing color="#4D96FF" />
      ) : hovered ? (
        <LocalSelectionRing color="#9CC9FF" />
      ) : null}
    </group>
  );
}

export const PrimitiveAsset = memo(PrimitiveAssetComponent);
