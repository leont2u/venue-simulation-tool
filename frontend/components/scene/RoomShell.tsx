"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type RoomShellProps = {
  width: number;
  depth: number;
  height: number;
  wallThickness?: number;
  wallColor?: string;
  floorColor?: string;
};

type WallDefinition = {
  key: string;
  position: [number, number, number];
  scale: [number, number, number];
  normal: THREE.Vector3;
};

function AdaptiveWalls({
  width,
  depth,
  height,
  wallThickness,
  wallColor,
}: Required<Omit<RoomShellProps, "floorColor">>) {
  const { camera } = useThree();
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  const walls = useMemo<WallDefinition[]>(
    () => [
      {
        key: "north",
        position: [0, height / 2, -depth / 2],
        scale: [width, height, wallThickness],
        normal: new THREE.Vector3(0, 0, -1),
      },
      {
        key: "south",
        position: [0, height / 2, depth / 2],
        scale: [width, height, wallThickness],
        normal: new THREE.Vector3(0, 0, 1),
      },
      {
        key: "west",
        position: [-width / 2, height / 2, 0],
        scale: [wallThickness, height, depth],
        normal: new THREE.Vector3(-1, 0, 0),
      },
      {
        key: "east",
        position: [width / 2, height / 2, 0],
        scale: [wallThickness, height, depth],
        normal: new THREE.Vector3(1, 0, 0),
      },
    ],
    [depth, height, wallThickness, width],
  );

  useFrame(() => {
    walls.forEach((wall, index) => {
      const material = materialsRef.current[index];
      if (!material) return;

      const wallCenter = new THREE.Vector3(...wall.position);
      const toCamera = camera.position.clone().sub(wallCenter).normalize();
      const facing = Math.max(0, toCamera.dot(wall.normal));
      const distance = camera.position.distanceTo(wallCenter);

      // Front-facing walls fade more aggressively so the room reads as a cutaway.
      const targetOpacity = THREE.MathUtils.clamp(
        0.82 - facing * 0.62 + Math.min(distance / 80, 0.14),
        0.16,
        0.82,
      );

      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.14);
    });
  });

  return (
    <>
      {walls.map((wall, index) => (
        <mesh
          key={wall.key}
          position={wall.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={wall.scale} />
          <meshStandardMaterial
            ref={(material) => {
              if (material) materialsRef.current[index] = material;
            }}
            color={wallColor}
            roughness={0.92}
            metalness={0.02}
            transparent
            opacity={0.78}
          />
        </mesh>
      ))}
    </>
  );
}

export function RoomShell({
  width,
  depth,
  height,
  wallThickness = 0.15,
  wallColor = "#F6F2EC",
  floorColor = "#F4F1EA",
}: RoomShellProps) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial color="#ece9e2" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={floorColor} roughness={0.95} metalness={0.02} />
      </mesh>

      <AdaptiveWalls
        width={width}
        depth={depth}
        height={height}
        wallThickness={wallThickness}
        wallColor={wallColor}
      />
    </group>
  );
}
