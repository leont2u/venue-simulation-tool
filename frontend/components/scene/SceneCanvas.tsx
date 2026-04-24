"use client";

import { Environment, Grid, OrbitControls, TransformControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AlignmentGuide, clampToRoom, collidesWithOthers, snapPositionToNeighbors } from "@/lib/editorPhysics";
import {
  getCableColor,
  getCablePathPoints,
  inferCableType,
  isAvItem,
  resolveConnectionItems,
} from "@/lib/sceneConnections";
import { RoomShell } from "@/components/scene/RoomShell";
import { PrimitiveAsset } from "@/components/scene/PrimitiveAsset";
import { useEditorStore } from "@/store/UseEditorStore";
import { Project } from "@/types/types";

function CameraCoverage({
  position,
  rotationY,
  active,
}: {
  position: [number, number, number];
  rotationY: number;
  active: boolean;
}) {
  const coneColor = active ? "#4D96FF" : "#90CAF9";

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.02, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.8, 48, -Math.PI / 6, Math.PI / 3]} />
        <meshBasicMaterial
          color={coneColor}
          transparent
          opacity={active ? 0.28 : 0.14}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.ConeGeometry(2.2, 4.5, 24, 1, true, -Math.PI / 6, Math.PI / 3)]} />
        <lineBasicMaterial color={coneColor} />
      </lineSegments>
    </group>
  );
}

function TransformGizmo({
  project,
  orbitRef,
  onGuidesChange,
}: {
  project: Project;
  orbitRef: React.MutableRefObject<THREE.EventDispatcher | null>;
  onGuidesChange: (guides: AlignmentGuide[]) => void;
}) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const toolMode = useEditorStore((s) => s.toolMode);
  const updateItem = useEditorStore((s) => s.updateItem);
  const snapToGrid = useEditorStore((s) => s.project?.sceneSettings?.snapToGrid ?? true);
  const transformRef = useRef<THREE.EventDispatcher | null>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const lastValidRef = useRef<{
    position: THREE.Vector3;
    rotationY: number;
    scale: [number, number, number];
  } | null>(null);

  const item = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return project.items.find((entry) => entry.id === selectedIds[0]) ?? null;
  }, [project.items, selectedIds]);

  useEffect(() => {
    if (!transformRef.current || !orbitRef.current) return;

    const controls = transformRef.current as unknown as {
      addEventListener: (type: string, fn: () => void) => void;
      removeEventListener: (type: string, fn: () => void) => void;
      dragging: boolean;
    };
    const orbit = orbitRef.current as unknown as { enabled: boolean };

    const onDragChange = () => {
      orbit.enabled = !controls.dragging;
    };

    controls.addEventListener("dragging-changed", onDragChange);
    return () => controls.removeEventListener("dragging-changed", onDragChange);
  }, [orbitRef, transformRef]);

  useEffect(() => {
    if (!item) return;
    lastValidRef.current = {
      position: new THREE.Vector3(item.x, item.y, item.z),
      rotationY: item.rotationY,
      scale: [...item.scale],
    };
  }, [item]);

  if (!item || toolMode === "select" || toolMode === "connect") {
    onGuidesChange([]);
    return null;
  }

  return (
    <TransformControls
      ref={transformRef}
      mode={toolMode === "scale" ? "scale" : toolMode}
      translationSnap={snapToGrid ? 0.25 : undefined}
      rotationSnap={snapToGrid ? Math.PI / 12 : undefined}
      scaleSnap={snapToGrid ? 0.1 : undefined}
      onObjectChange={() => {
        const object = targetRef.current;
        if (!object) return;

        const others = project.items.filter((entry) => entry.id !== item.id);
        const snapped = snapPositionToNeighbors(
          {
            ...item,
            x: object.position.x,
            y: object.position.y,
            z: object.position.z,
            rotationY: object.rotation.y,
            scale: [
              Math.max(0.2, object.scale.x),
              Math.max(0.2, object.scale.y),
              Math.max(0.2, object.scale.z),
            ],
          },
          others,
        );
        const clamped = clampToRoom(
          {
            ...item,
            x: snapped.x,
            y: object.position.y,
            z: snapped.z,
            rotationY: object.rotation.y,
            scale: [
              Math.max(0.2, object.scale.x),
              Math.max(0.2, object.scale.y),
              Math.max(0.2, object.scale.z),
            ],
          },
          project.room,
        );

        const candidate = {
          ...item,
          x: snapToGrid ? Math.round(clamped.x * 4) / 4 : clamped.x,
          y: object.position.y,
          z: snapToGrid ? Math.round(clamped.z * 4) / 4 : clamped.z,
          rotationY: object.rotation.y,
          scale: [
            Math.max(0.2, object.scale.x),
            Math.max(0.2, object.scale.y),
            Math.max(0.2, object.scale.z),
          ] as [number, number, number],
        };

        if (collidesWithOthers(candidate, others)) {
          const lastValid = lastValidRef.current;
          if (lastValid) {
            object.position.copy(lastValid.position);
            object.rotation.y = lastValid.rotationY;
            object.scale.set(...lastValid.scale);
          }
          return;
        }

        lastValidRef.current = {
          position: new THREE.Vector3(candidate.x, candidate.y, candidate.z),
          rotationY: candidate.rotationY,
          scale: [...candidate.scale],
        };
        onGuidesChange(snapped.guides);

        updateItem(item.id, {
          x: candidate.x,
          y: candidate.y,
          z: candidate.z,
          rotationY: candidate.rotationY,
          scale: candidate.scale,
        });
      }}
    >
      <group
        ref={targetRef}
        position={[item.x, item.y, item.z]}
        rotation={[0, item.rotationY, 0]}
        scale={item.scale}
      />
    </TransformControls>
  );
}

function SceneControls({
  orbitRef,
}: {
  orbitRef: React.MutableRefObject<THREE.EventDispatcher | null>;
}) {
  const controlsRef = useRef<THREE.EventDispatcher | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    orbitRef.current = controlsRef.current;
  }, [orbitRef, controlsRef]);

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        minDistance={6}
        maxDistance={80}
        enableDamping
        dampingFactor={0.08}
        target={[0, 0, 0]}
        camera={camera}
      />
    </>
  );
}

export function SceneCanvas({
  projectOverride,
  readOnly = false,
}: {
  projectOverride?: Project | null;
  readOnly?: boolean;
}) {
  const storedProject = useEditorStore((s) => s.project);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const activeLayer = useEditorStore((s) => s.activeLayer);
  const toolMode = useEditorStore((s) => s.toolMode);
  const selectItem = useEditorStore((s) => s.selectItem);
  const addItemFromAsset = useEditorStore((s) => s.addItemFromAsset);
  const addConnection = useEditorStore((s) => s.addConnection);
  const viewportZoom = useEditorStore((s) => s.viewportZoom);
  const orbitRef = useRef<THREE.EventDispatcher | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const project = projectOverride ?? storedProject;

  useEffect(() => {
    if (readOnly) return;
    document.body.style.cursor = hoveredId ? "grab" : "default";
    return () => {
      document.body.style.cursor = "default";
    };
  }, [hoveredId, readOnly]);

  if (!project) return null;

  const settings = project.sceneSettings;
  const visibleItems = project.items.filter((item) => {
    if (activeLayer === "layout") return !isAvItem(item);
    if (activeLayer === "av") return isAvItem(item);
    return true;
  });
  const visibleConnections =
    activeLayer === "layout"
      ? []
      : (project.connections ?? []).filter((connection) =>
          Boolean(resolveConnectionItems(project, connection)),
        );

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (readOnly) return;
        const assetId = event.dataTransfer.getData("text/asset-id");
        if (assetId) addItemFromAsset(assetId);
      }}
    >
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [18 / viewportZoom, 14 / viewportZoom, 18 / viewportZoom], fov: 50 }}
        onPointerMissed={() => {
          if (!readOnly) selectItem(null);
        }}
      >
        <ambientLight intensity={settings?.ambientLightIntensity ?? 1.1} />
        <directionalLight
          position={[14, 20, 10]}
          intensity={settings?.directionalLightIntensity ?? 2.1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <Suspense fallback={null}>
          {settings?.enableHdri !== false ? <Environment preset="city" /> : null}
          {settings?.showGrid !== false ? (
            <Grid
              args={[80, 80]}
              cellSize={1}
              sectionSize={5}
              fadeDistance={80}
            />
          ) : null}

          <RoomShell
            width={project.room.width}
            depth={project.room.depth}
            height={project.room.height}
            wallThickness={
              project.room.wallThickness ?? project.sceneSettings?.wallThickness
            }
            wallColor={project.sceneSettings?.wallColor}
            floorColor={project.sceneSettings?.floorColor}
          />

          {visibleConnections.map((connection) => {
            const resolved = resolveConnectionItems(project, connection);
            if (!resolved) return null;

            const cablePoints = getCablePathPoints(
              resolved.fromItem,
              resolved.toItem,
            );

            return (
              <line key={connection.id}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array(
                        cablePoints.flatMap((point) => [point.x, 0.08, point.z]),
                      ),
                      3,
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial color={getCableColor(connection.cableType)} />
              </line>
            );
          })}

          {visibleItems.map((item) => (
            <group key={item.id}>
              <PrimitiveAsset
                url={item.assetUrl}
                position={[item.x, item.y, item.z]}
                rotation={[0, item.rotationY, 0]}
                scale={item.scale}
                selected={!readOnly && item.id === selectedIds[0]}
                hovered={item.id === hoveredId}
                color={item.color}
                material={item.material}
                onPointerEnter={readOnly ? undefined : () => setHoveredId(item.id)}
                onPointerLeave={readOnly ? undefined : () => setHoveredId((current) => (current === item.id ? null : current))}
                onClick={
                  readOnly
                    ? undefined
                    : () => {
                        if (toolMode === "connect") {
                          if (selectedIds.length === 1 && selectedIds[0] !== item.id) {
                            const source = project.items.find(
                              (entry) => entry.id === selectedIds[0],
                            );
                            if (source) {
                              addConnection(
                                source.id,
                                item.id,
                                inferCableType(source, item),
                              );
                            }
                          } else {
                            selectItem(item.id);
                          }
                          return;
                        }

                        selectItem(item.id);
                      }
                }
              />

              {item.type === "camera" ? (
                <CameraCoverage
                  position={[item.x, item.y, item.z]}
                  rotationY={item.rotationY}
                  active={settings?.livestreamMode ?? false}
                />
              ) : null}
            </group>
          ))}

          {guides.map((guide, index) =>
            guide.orientation === "vertical" ? (
              <line key={`guide-v-${index}`}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        guide.value,
                        0.03,
                        -project.room.depth / 2,
                        guide.value,
                        0.03,
                        project.room.depth / 2,
                      ]),
                      3,
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#4D96FF" />
              </line>
            ) : (
              <line key={`guide-h-${index}`}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        -project.room.width / 2,
                        0.03,
                        guide.value,
                        project.room.width / 2,
                        0.03,
                        guide.value,
                      ]),
                      3,
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#4D96FF" />
              </line>
            ),
          )}

          <SceneControls
            orbitRef={orbitRef}
          />
          {!readOnly ? (
            <TransformGizmo
              project={project}
              orbitRef={orbitRef}
              onGuidesChange={setGuides}
            />
          ) : null}
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute bottom-5 left-5 rounded-[10px] bg-[#111111]/78 px-3 py-2 text-[12px] text-white shadow-lg">
        {toolMode === "connect"
          ? "Connect mode: click one AV item, then another to create a cable run."
          : "Mouse: rotate · Scroll: zoom · Shift+drag: pan"}
      </div>
    </div>
  );
}
