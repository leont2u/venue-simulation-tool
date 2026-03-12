"use client";

import { Canvas } from "@react-three/fiber";
import {
  Environment,
  Grid,
  OrbitControls,
  TransformControls,
} from "@react-three/drei";
import { RoomShell } from "@/components/scene/RoomShell";
import { PrimitiveAsset } from "@/components/scene/PrimitiveAsset";
import { Suspense, useMemo, useRef } from "react";
import { useEditorStore } from "@/store/UseEditorStore";
import * as THREE from "three";

function SceneObjects() {
  const project = useEditorStore((s) => s.project);
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectItem = useEditorStore((s) => s.selectItem);
  const updateItem = useEditorStore((s) => s.updateItem);
  const toolMode = useEditorStore((s) => s.toolMode);

  const selectedGroupRef = useRef<THREE.Group | null>(null);

  const selectedItem = useMemo(
    () => project?.items.find((item) => item.id === selectedId) ?? null,
    [project, selectedId],
  );

  if (!project) return null;

  return (
    <>
      <Environment preset="city" />

      <Grid
        args={[80, 80]}
        cellSize={1}
        sectionSize={5}
        fadeDistance={120}
        fadeStrength={1}
        infiniteGrid
      />

      <RoomShell
        width={project.room.width}
        depth={project.room.depth}
        height={project.room.height}
      />

      {project.items.map((item) => {
        const isSelected = item.id === selectedId;
        const useGizmo = isSelected && toolMode === "transform";

        const object = (
          <PrimitiveAsset
            id={item.id}
            url={item.assetUrl}
            position={[item.x, item.y, item.z]}
            rotation={[0, item.rotationY, 0]}
            scale={item.scale}
            selected={isSelected}
            draggable={toolMode === "move" || toolMode === "select"}
            onClick={() => selectItem(item.id)}
            onMove={(x, z) =>
              updateItem(item.id, {
                x,
                z,
              })
            }
          />
        );

        if (!useGizmo) {
          return <group key={item.id}>{object}</group>;
        }

        return (
          <TransformControls
            key={item.id}
            mode="translate"
            onObjectChange={() => {
              const obj = selectedGroupRef.current;
              if (!obj) return;

              updateItem(item.id, {
                x: obj.position.x,
                y: obj.position.y,
                z: obj.position.z,
                rotationY: obj.rotation.y,
              });
            }}
          >
            <group
              ref={selectedGroupRef}
              position={[item.x, item.y, item.z]}
              rotation={[0, item.rotationY, 0]}
            >
              <PrimitiveAsset
                id={item.id}
                url={item.assetUrl}
                position={[0, 0, 0]}
                rotation={[0, 0, 0]}
                scale={item.scale}
                selected={true}
                draggable={false}
                onClick={() => selectItem(item.id)}
              />
            </group>
          </TransformControls>
        );
      })}

      {selectedItem && toolMode === "rotate" && (
        <mesh
          position={[selectedItem.x, selectedItem.y + 0.05, selectedItem.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[1.2, 0.03, 12, 60]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      )}
    </>
  );
}

export function SceneCanvas() {
  const project = useEditorStore((s) => s.project);
  const selectItem = useEditorStore((s) => s.selectItem);

  if (!project) return null;

  return (
    <div className="h-full w-full bg-[#0b0f19]">
      <Canvas
        shadows
        camera={{ position: [18, 14, 18], fov: 50 }}
        onPointerMissed={() => selectItem(null)}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[12, 16, 8]} intensity={2} castShadow />

        <Suspense fallback={null}>
          <SceneObjects />
        </Suspense>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
