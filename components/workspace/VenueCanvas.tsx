"use client";

import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  useGLTF,
  Center,
} from "@react-three/drei";
import { AssetKey, LayoutBlueprint } from "@/lib/layout.types";

type ViewMode = "3d" | "topdown" | "layers";

function Room({
  width,
  length,
  height,
}: {
  width: number;
  length: number;
  height: number;
}) {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial />
      </mesh>

      {/* Simple wall outline (optional MVP) */}
      <mesh position={[0, height / 2, -length / 2]} castShadow>
        <boxGeometry args={[width, height, 0.2]} />
        <meshStandardMaterial transparent opacity={0.05} />
      </mesh>
      <mesh position={[0, height / 2, length / 2]} castShadow>
        <boxGeometry args={[width, height, 0.2]} />
        <meshStandardMaterial transparent opacity={0.05} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} castShadow>
        <boxGeometry args={[0.2, height, length]} />
        <meshStandardMaterial transparent opacity={0.05} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]} castShadow>
        <boxGeometry args={[0.2, height, length]} />
        <meshStandardMaterial transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

function AssetModel({ asset, scale = 1 }: { asset: AssetKey; scale?: number }) {
  const url =
    asset === "BANQUET_CATERING"
      ? "/assets/banquet_catering.glb"
      : "/assets/stage.glb";

  const { scene } = useGLTF(url);

  return <primitive object={scene} scale={scale} />;
}

function SceneContent({
  blueprint,
  viewMode,
}: {
  blueprint: LayoutBlueprint;
  viewMode: ViewMode;
}) {
  const cameraPos = useMemo(() => {
    if (viewMode === "topdown") return [0.01, 35, 0.01] as const;
    return [18, 14, 18] as const;
  }, [viewMode]);

  console.log("items", blueprint.items);

  return (
    <>
      <PerspectiveCamera makeDefault position={cameraPos} fov={45} />
      <ambientLight intensity={2} />
      <directionalLight position={[10, 20, 10]} intensity={3} />
      <Room {...blueprint.room} />
      {blueprint.items.map((it) => (
        <group key={it.id} position={it.position} rotation={it.rotation}>
          <AssetModel asset={it.asset} scale={it.scale ?? 1} />
        </group>
      ))}
      <OrbitControls
        target={[0, 0, 0]}
        enablePan
        enableZoom
        enableRotate={viewMode !== "layers"}
        minPolarAngle={viewMode === "topdown" ? Math.PI / 2 : 0}
        maxPolarAngle={viewMode === "topdown" ? Math.PI / 2 : Math.PI / 2.1}
      />
    </>
  );
}

export function VenueCanvas({
  blueprint,
  viewMode,
}: {
  blueprint: LayoutBlueprint | null;
  viewMode: ViewMode;
}) {
  if (!blueprint) return null;

  return (
    <Canvas className="h-full w-full" shadows>
      <Suspense fallback={null}>
        <SceneContent blueprint={blueprint} viewMode={viewMode} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload("/assets/banquet_catering.glb");
useGLTF.preload("/assets/stage.glb");
