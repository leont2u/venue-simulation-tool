"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Grid, OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import { RoomShell } from "@/components/scene/RoomShell";
import { PrimitiveAsset } from "@/components/scene/PrimitiveAsset";
import { useEditorStore } from "@/store/UseEditorStore";

export function SceneCanvas() {
  const project = useEditorStore((s) => s.project);
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectItem = useEditorStore((s) => s.selectItem);

  if (!project) return null;

  return (
    <div className="h-full w-full">
      <Canvas
        shadows
        camera={{ position: [18, 14, 18], fov: 50 }}
        onPointerMissed={() => selectItem(null)}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[12, 16, 8]} intensity={2} castShadow />

        <Suspense fallback={null}>
          <Environment preset="city" />
          <Grid
            args={[60, 60]}
            cellSize={1}
            sectionSize={5}
            fadeDistance={70}
          />

          <RoomShell width={project.room.width} depth={project.room.depth} />

          {project.items.map((item) => (
            <PrimitiveAsset
              key={item.id}
              url={item.assetUrl}
              position={[item.x, item.y, item.z]}
              rotation={[0, item.rotationY, 0]}
              scale={item.scale}
              selected={item.id === selectedId}
              onClick={() => selectItem(item.id)}
            />
          ))}
        </Suspense>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
