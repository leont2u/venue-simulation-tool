"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Project, SceneSettings, VenueArchitecture, VenueOpening } from "@/types/types";

type RoomShellProps = {
  width: number;
  depth: number;
  height: number;
  wallThickness?: number;
  wallColor?: string;
  floorColor?: string;
  settings?: SceneSettings;
  architecture?: VenueArchitecture;
};

type WallDefinition = {
  key: VenueOpening["wall"];
  length: number;
  depthLength: number;
  center: [number, number, number];
  rotationY: number;
  normal: THREE.Vector3;
};

const WALLS: VenueOpening["wall"][] = ["north", "south", "east", "west"];

function makeTexture(kind: string, base: string, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;

  if (kind === "Wood") {
    for (let x = 0; x < 512; x += 64) {
      ctx.fillStyle = x % 128 === 0 ? "rgba(80,54,30,0.08)" : "rgba(255,255,255,0.08)";
      ctx.fillRect(x, 0, 64, 512);
      ctx.strokeRect(x + 1, 0, 62, 512);
      for (let y = 24; y < 512; y += 92) {
        ctx.beginPath();
        ctx.ellipse(x + 32, y + ((x / 64) % 2) * 20, 20, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } else if (kind === "Carpet" || kind === "Banquet") {
    for (let y = 0; y < 512; y += 18) {
      ctx.strokeStyle = y % 36 === 0 ? "rgba(60,60,60,0.12)" : "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y + 8);
      ctx.stroke();
    }
    if (kind === "Banquet") {
      ctx.strokeStyle = "rgba(142,91,74,0.18)";
      for (let x = -512; x < 512; x += 58) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 512, 512);
        ctx.stroke();
      }
    }
  } else {
    const tileSize = kind === "Marble" ? 128 : 96;
    for (let x = 0; x <= 512; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    if (kind === "Marble") {
      ctx.strokeStyle = "rgba(120,118,112,0.22)";
      for (let i = 0; i < 22; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 512, Math.random() * 512);
        ctx.bezierCurveTo(Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.anisotropy = 8;
  return texture;
}

function useVenueMaterials(settings?: SceneSettings, floorColor = "#F4F1EA", wallColor = "#F6F2EC") {
  return useMemo(() => {
    const floorMaterial = settings?.floorMaterial ?? "Wood";
    const floorMap = typeof document !== "undefined"
      ? makeTexture(
          floorMaterial,
          floorMaterial === "Carpet" ? "#7f7268" : floorMaterial === "Marble" ? "#e7e4dc" : floorMaterial === "Concrete" ? "#c9c7c0" : floorMaterial === "Tiles" ? "#dedbd2" : floorColor,
          "rgba(65,62,56,0.24)",
        )
      : null;
    const wallMap = typeof document !== "undefined"
      ? makeTexture(settings?.wallMaterial === "Draping" ? "Carpet" : "Tiles", wallColor, "rgba(110,105,94,0.14)")
      : null;

    return {
      floor: new THREE.MeshStandardMaterial({
        color: floorColor,
        map: floorMap ?? undefined,
        roughness: floorMaterial === "Marble" ? 0.38 : floorMaterial === "Concrete" ? 0.82 : 0.64,
        metalness: floorMaterial === "Marble" ? 0.08 : 0.02,
        envMapIntensity: floorMaterial === "Marble" ? 0.55 : 0.18,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: wallColor,
        map: wallMap ?? undefined,
        roughness: settings?.wallMaterial === "LED Backdrop" ? 0.32 : 0.86,
        metalness: settings?.wallMaterial === "Decorative" ? 0.06 : 0.01,
        transparent: true,
        opacity: 0.9,
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: "#f5f1ea",
        roughness: 0.92,
        metalness: 0,
        transparent: true,
        opacity: 0.86,
      }),
      route: new THREE.MeshStandardMaterial({
        color: "#d9caa6",
        roughness: 0.76,
        metalness: 0.02,
        transparent: true,
        opacity: 0.72,
      }),
    };
  }, [floorColor, settings?.floorMaterial, settings?.wallMaterial, wallColor]);
}

function getWall(width: number, depth: number, height: number, wall: VenueOpening["wall"]): WallDefinition {
  if (wall === "north") {
    return { key: wall, length: width, depthLength: depth, center: [0, height / 2, -depth / 2], rotationY: 0, normal: new THREE.Vector3(0, 0, -1) };
  }
  if (wall === "south") {
    return { key: wall, length: width, depthLength: depth, center: [0, height / 2, depth / 2], rotationY: 0, normal: new THREE.Vector3(0, 0, 1) };
  }
  if (wall === "east") {
    return { key: wall, length: depth, depthLength: width, center: [width / 2, height / 2, 0], rotationY: Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) };
  }
  return { key: wall, length: depth, depthLength: width, center: [-width / 2, height / 2, 0], rotationY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) };
}

function WallWithOpenings({
  wall,
  openings,
  height,
  thickness,
  material,
}: {
  wall: WallDefinition;
  openings: VenueOpening[];
  height: number;
  thickness: number;
  material: THREE.Material;
}) {
  const spans = useMemo(() => {
    const sorted = openings
      .map((opening) => ({
        start: Math.max(-wall.length / 2, opening.offset - opening.width / 2),
        end: Math.min(wall.length / 2, opening.offset + opening.width / 2),
        opening,
      }))
      .sort((a, b) => a.start - b.start);
    const segments: { center: number; width: number; y: number; h: number }[] = [];
    let cursor = -wall.length / 2;

    for (const span of sorted) {
      if (span.start > cursor) {
        segments.push({ center: (cursor + span.start) / 2, width: span.start - cursor, y: height / 2, h: height });
      }
      const topStart = (span.opening.sillHeight ?? 0) + span.opening.height;
      if (span.opening.sillHeight && span.opening.sillHeight > 0) {
        segments.push({ center: (span.start + span.end) / 2, width: span.end - span.start, y: span.opening.sillHeight / 2, h: span.opening.sillHeight });
      }
      if (topStart < height) {
        segments.push({ center: (span.start + span.end) / 2, width: span.end - span.start, y: (topStart + height) / 2, h: height - topStart });
      }
      cursor = Math.max(cursor, span.end);
    }
    if (cursor < wall.length / 2) {
      segments.push({ center: (cursor + wall.length / 2) / 2, width: wall.length / 2 - cursor, y: height / 2, h: height });
    }
    return segments.filter((segment) => segment.width > 0.03 && segment.h > 0.03);
  }, [height, openings, wall.length]);

  return (
    <group position={wall.center} rotation={[0, wall.rotationY, 0]}>
      {spans.map((segment, index) => (
        <mesh
          key={`${wall.key}-${index}`}
          position={[segment.center, segment.y - height / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[segment.width, segment.h, thickness]} />
          <primitive attach="material" object={material} />
        </mesh>
      ))}
    </group>
  );
}

function AdaptiveWallOpacity({
  materials,
  walls,
}: {
  materials: THREE.MeshStandardMaterial[];
  walls: WallDefinition[];
}) {
  const { camera } = useThree();

  useFrame(() => {
    walls.forEach((wall, index) => {
      const material = materials[index];
      if (!material) return;
      const wallCenter = new THREE.Vector3(...wall.center);
      const toCamera = camera.position.clone().sub(wallCenter).normalize();
      const facing = Math.max(0, toCamera.dot(wall.normal));
      material.opacity = THREE.MathUtils.lerp(material.opacity, THREE.MathUtils.clamp(0.9 - facing * 0.52, 0.24, 0.9), 0.12);
    });
  });

  return null;
}

function OpeningDetails({ width, depth, height, architecture }: { width: number; depth: number; height: number; architecture: VenueArchitecture }) {
  const allDoors = [...architecture.doors, ...architecture.entrances, ...architecture.exits];
  const toPosition = (opening: VenueOpening, y: number): [number, number, number] => {
    if (opening.wall === "north") return [opening.offset, y, -depth / 2 + 0.04];
    if (opening.wall === "south") return [opening.offset, y, depth / 2 - 0.04];
    if (opening.wall === "east") return [width / 2 - 0.04, y, opening.offset];
    return [-width / 2 + 0.04, y, opening.offset];
  };
  const rotation = (opening: VenueOpening): [number, number, number] =>
    opening.wall === "east" || opening.wall === "west" ? [0, Math.PI / 2, 0] : [0, 0, 0];

  return (
    <>
      {architecture.windows.map((window) => (
        <mesh
          key={window.id}
          position={toPosition(window, (window.sillHeight ?? 1) + window.height / 2)}
          rotation={rotation(window)}
        >
          <boxGeometry args={[window.width, window.height, 0.035]} />
          <meshPhysicalMaterial color="#a9d3df" roughness={0.08} metalness={0} transmission={0.28} transparent opacity={0.36} />
        </mesh>
      ))}
      {allDoors.map((door) => (
        <group key={door.id} position={toPosition(door, door.height / 2)} rotation={rotation(door)}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[door.width, door.height, 0.07]} />
            <meshStandardMaterial color="#5b4535" roughness={0.62} metalness={0.04} />
          </mesh>
          <mesh position={[door.width * 0.33, 0, 0.055]}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshStandardMaterial color="#c2a24d" roughness={0.32} metalness={0.75} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Routes({ routes, material }: { routes: VenueArchitecture["stageAccessRoutes"]; material: THREE.Material }) {
  return (
    <>
      {routes.map((route) =>
        route.points.length < 2 ? null : (
          <group key={route.id}>
            {route.points.slice(0, -1).map((point, index) => {
              const next = route.points[index + 1];
              const dx = next.x - point.x;
              const dz = next.z - point.z;
              const length = Math.hypot(dx, dz);
              const angle = Math.atan2(dx, dz);
              return (
                <mesh
                  key={`${route.id}-${index}`}
                  position={[point.x + dx / 2, 0.025, point.z + dz / 2]}
                  rotation={[-Math.PI / 2, 0, -angle]}
                  receiveShadow
                >
                  <planeGeometry args={[route.width, length]} />
                  <primitive attach="material" object={material} />
                </mesh>
              );
            })}
          </group>
        ),
      )}
    </>
  );
}

function CeilingDetails({ width, depth, height, architecture }: { width: number; depth: number; height: number; architecture: VenueArchitecture }) {
  if (!architecture.hasCeiling || (!architecture.ceilingDraping && !architecture.decorativeLighting)) return null;
  return (
    <group>
      {architecture.ceilingDraping
        ? [-0.32, 0, 0.32].map((offset) => (
            <mesh key={offset} position={[0, height - 0.24, offset * depth]} rotation={[0, 0, Math.PI / 18]}>
              <boxGeometry args={[width * 0.94, 0.055, 0.28]} />
              <meshStandardMaterial color="#f3e7db" roughness={0.94} metalness={0} />
            </mesh>
          ))
        : null}
      {architecture.decorativeLighting
        ? Array.from({ length: 7 }).map((_, index) => {
            const x = -width * 0.36 + index * (width * 0.12);
            return (
              <group key={index} position={[x, height - 0.18, depth * 0.18]}>
                <mesh>
                  <sphereGeometry args={[0.08, 16, 16]} />
                  <meshStandardMaterial color="#fff0c2" emissive="#ffc56a" emissiveIntensity={0.75} roughness={0.2} />
                </mesh>
                <pointLight color="#ffd59a" intensity={0.22} distance={5} />
              </group>
            );
          })
        : null}
    </group>
  );
}

function StageBackdrop({ width, depth, height, architecture }: { width: number; depth: number; height: number; architecture: VenueArchitecture }) {
  if (!architecture.stageBackdrop || architecture.stageBackdrop === "none") return null;
  const isLed = architecture.stageBackdrop === "led";
  return (
    <group position={[0, height * 0.42, -depth / 2 + 0.16]}>
      <mesh receiveShadow>
        <boxGeometry args={[Math.min(width * 0.58, 16), height * 0.58, 0.08]} />
        <meshStandardMaterial
          color={isLed ? "#182133" : "#efe4da"}
          roughness={isLed ? 0.24 : 0.88}
          metalness={isLed ? 0.18 : 0.02}
          emissive={isLed ? "#31548f" : "#000000"}
          emissiveIntensity={isLed ? 0.85 : 0}
        />
      </mesh>
      {isLed ? <pointLight color="#6ba5ff" intensity={1.4} distance={14} position={[0, 0, 1.8]} /> : null}
    </group>
  );
}

function defaultArchitecture(projectRoom: Project["room"], settings?: SceneSettings): VenueArchitecture {
  return {
    shape: "rectangular",
    doors: [{ id: "door-main", wall: "south", offset: 0, width: 2.4, height: 2.3 }],
    windows: [],
    columns: [],
    entrances: [],
    exits: [],
    stageAccessRoutes: [],
    hasCeiling: settings?.venueEnvironment !== "outdoor",
    ceilingHeight: projectRoom.height,
    decorativeLighting: true,
    stageBackdrop: "draping",
  };
}

export function RoomShell({
  width,
  depth,
  height,
  wallThickness = 0.15,
  wallColor = "#F6F2EC",
  floorColor = "#F4F1EA",
  settings,
  architecture,
}: RoomShellProps) {
  const resolvedArchitecture = architecture ?? defaultArchitecture({ width, depth, height, wallThickness }, settings);
  const materials = useVenueMaterials(settings, floorColor, wallColor);
  const walls = useMemo(() => WALLS.map((wall) => getWall(width, depth, height, wall)), [depth, height, width]);
  const wallMaterials = useMemo(
    () =>
      walls.map(() => {
        const material = materials.wall.clone();
        material.transparent = true;
        return material;
      }),
    [materials.wall, walls],
  );
  const openings = [...resolvedArchitecture.doors, ...resolvedArchitecture.windows, ...resolvedArchitecture.entrances, ...resolvedArchitecture.exits];
  const isOutdoor = settings?.venueEnvironment === "outdoor";
  const isTent = settings?.venueEnvironment === "tent";

  return (
    <group>
      <AdaptiveWallOpacity materials={wallMaterials} walls={walls} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[Math.max(220, width * 3), Math.max(220, depth * 3)]} />
        <meshStandardMaterial color={isOutdoor ? "#6f7e63" : "#dfddd5"} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <primitive attach="material" object={materials.floor} />
      </mesh>

      <Routes routes={resolvedArchitecture.stageAccessRoutes} material={materials.route} />

      {!isOutdoor
        ? walls.map((wall, index) => (
            <WallWithOpenings
              key={wall.key}
              wall={wall}
              openings={openings.filter((opening) => opening.wall === wall.key)}
              height={height}
              thickness={wallThickness}
              material={wallMaterials[index]}
            />
          ))
        : null}

      <OpeningDetails width={width} depth={depth} height={height} architecture={resolvedArchitecture} />

      {resolvedArchitecture.columns.map((column) => (
        <mesh key={column.id} position={[column.x, (column.height ?? height) / 2, column.z]} castShadow receiveShadow>
          <cylinderGeometry args={[column.radius, column.radius, column.height ?? height, 28]} />
          <meshStandardMaterial color="#ddd6cb" roughness={0.78} metalness={0.04} />
        </mesh>
      ))}

      {resolvedArchitecture.hasCeiling && !isOutdoor ? (
        <mesh position={[0, resolvedArchitecture.ceilingHeight ?? height, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[width, depth]} />
          <primitive attach="material" object={materials.ceiling} />
        </mesh>
      ) : null}

      {isTent ? (
        <mesh position={[0, height + 0.9, 0]} rotation={[0, 0, Math.PI / 4]} castShadow receiveShadow>
          <coneGeometry args={[Math.max(width, depth) * 0.72, 1.8, 4]} />
          <meshStandardMaterial color="#f4efe4" roughness={0.9} metalness={0} transparent opacity={0.84} />
        </mesh>
      ) : null}

      {!isOutdoor ? <CeilingDetails width={width} depth={depth} height={height} architecture={resolvedArchitecture} /> : null}
      <StageBackdrop width={width} depth={depth} height={height} architecture={resolvedArchitecture} />
    </group>
  );
}
