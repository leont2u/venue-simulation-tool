"use client";

import { Environment, Grid, OrbitControls, TransformControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  AlignmentGuide,
  clampToRoom,
  collidesWithOthers,
  getItemFootprint,
  snapPositionToNeighbors,
} from "@/lib/editorPhysics";
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

type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  mode: "select" | "deselect";
};

type MarqueeState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  mode: "select" | "deselect";
};

type DragState = {
  itemId: string;
  selectedIds: string[];
  startPoint: THREE.Vector3;
  originalItems: Map<string, { x: number; y: number; z: number }>;
  beforeProject: Project;
  didMove: boolean;
  pointerId: number;
  raf: number | null;
  latestDelta: THREE.Vector3;
};

type CanvasPointerEvent = React.PointerEvent<HTMLDivElement> & {
  sourceEvent?: PointerEvent;
  ray?: THREE.Ray;
};

const DRAG_THRESHOLD = 0.04;
const POINTER_SELECT_THRESHOLD = 4;
const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function rectFromPoints(a: { x: number; y: number }, b: { x: number; y: number }) {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  return {
    left,
    top,
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

function projectItemToScreen(
  item: { x: number; y: number; z: number },
  camera: THREE.Camera,
  bounds: DOMRect,
) {
  const projected = new THREE.Vector3(item.x, item.y, item.z).project(camera);
  return {
    x: bounds.left + ((projected.x + 1) / 2) * bounds.width,
    y: bounds.top + ((1 - projected.y) / 2) * bounds.height,
  };
}

function pointInsideRect(point: { x: number; y: number }, rect: SelectionRect) {
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}

function itemFullyInsideRect(
  item: Project["items"][number],
  rect: SelectionRect,
  camera: THREE.Camera,
  bounds: DOMRect,
) {
  const footprint = getItemFootprint(item);
  const corners = [
    { x: item.x - footprint.halfWidth, y: item.y, z: item.z - footprint.halfDepth },
    { x: item.x + footprint.halfWidth, y: item.y, z: item.z - footprint.halfDepth },
    { x: item.x - footprint.halfWidth, y: item.y, z: item.z + footprint.halfDepth },
    { x: item.x + footprint.halfWidth, y: item.y, z: item.z + footprint.halfDepth },
  ];

  return corners.every((corner) =>
    pointInsideRect(projectItemToScreen(corner, camera, bounds), rect),
  );
}

function ViewportBridge({
  cameraRef,
  elementRef,
}: {
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
  elementRef: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  const { camera, gl } = useThree();

  useEffect(() => {
    cameraRef.current = camera;
    elementRef.current = gl.domElement;
  }, [camera, cameraRef, elementRef, gl]);

  return null;
}

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
  orbitRef: React.MutableRefObject<{ enabled: boolean } | null>;
  onGuidesChange: (guides: AlignmentGuide[]) => void;
}) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const toolMode = useEditorStore((s) => s.toolMode);
  const updateItemsTransient = useEditorStore((s) => s.updateItemsTransient);
  const commitProjectSnapshot = useEditorStore((s) => s.commitProjectSnapshot);
  const snapToGrid = useEditorStore((s) => s.project?.sceneSettings?.snapToGrid ?? true);
  const transformRef = useRef<{
    addEventListener: (type: string, fn: () => void) => void;
    removeEventListener: (type: string, fn: () => void) => void;
    dragging: boolean;
  } | null>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const beforeTransformRef = useRef<Project | null>(null);
  const transformStartRef = useRef<{
    center: THREE.Vector3;
    items: Map<string, { x: number; y: number; z: number }>;
  } | null>(null);
  const lastValidRef = useRef<{
    position: THREE.Vector3;
    rotationY: number;
    scale: [number, number, number];
  } | null>(null);

  const selectedItems = useMemo(() => {
    const selected = new Set(selectedIds);
    return project.items.filter((entry) => selected.has(entry.id));
  }, [project.items, selectedIds]);

  const primaryItem = selectedItems[0] ?? null;

  const transformCenter = useMemo(() => {
    if (selectedItems.length === 0) return new THREE.Vector3();
    const center = new THREE.Vector3();
    for (const item of selectedItems) center.add(new THREE.Vector3(item.x, item.y, item.z));
    return center.divideScalar(selectedItems.length);
  }, [selectedItems]);

  useEffect(() => {
    if (!transformRef.current || !orbitRef.current) return;

    const controls = transformRef.current;
    const orbit = orbitRef.current;

    const onDragChange = () => {
      if (controls.dragging && !beforeTransformRef.current) {
        beforeTransformRef.current = project;
        transformStartRef.current = {
          center: transformCenter.clone(),
          items: new Map(
            selectedItems.map((entry) => [
              entry.id,
              { x: entry.x, y: entry.y, z: entry.z },
            ]),
          ),
        };
      }

      if (!controls.dragging && beforeTransformRef.current) {
        commitProjectSnapshot(beforeTransformRef.current);
        beforeTransformRef.current = null;
        transformStartRef.current = null;
      }

      orbit.enabled = !controls.dragging;
    };

    controls.addEventListener("dragging-changed", onDragChange);
    return () => controls.removeEventListener("dragging-changed", onDragChange);
  }, [
    commitProjectSnapshot,
    orbitRef,
    project,
    selectedItems,
    transformCenter,
    transformRef,
  ]);

  useEffect(() => {
    if (!primaryItem) return;
    lastValidRef.current = {
      position: new THREE.Vector3(primaryItem.x, primaryItem.y, primaryItem.z),
      rotationY: primaryItem.rotationY,
      scale: [...primaryItem.scale],
    };
  }, [primaryItem]);

  if (
    !primaryItem ||
    toolMode === "select" ||
    toolMode === "connect" ||
    (selectedItems.length > 1 && toolMode !== "move")
  ) {
    onGuidesChange([]);
    return null;
  }

  return (
    <TransformControls
      ref={transformRef as never}
      mode={toolMode === "move" ? "translate" : toolMode}
      translationSnap={snapToGrid ? 0.25 : undefined}
      rotationSnap={snapToGrid ? Math.PI / 12 : undefined}
      scaleSnap={snapToGrid ? 0.1 : undefined}
      onObjectChange={() => {
        const object = targetRef.current;
        if (!object) return;

        if (selectedItems.length > 1) {
          const transformStart = transformStartRef.current;
          if (!transformStart) return;

          const delta = object.position.clone().sub(transformStart.center);
          updateItemsTransient(selectedIds, (item) => {
            const original = transformStart.items.get(item.id);
            if (!original) return item;
            const candidate = {
              ...item,
              x: original.x + delta.x,
              y: original.y,
              z: original.z + delta.z,
            };
            const clamped = clampToRoom(candidate, project.room);
            return {
              ...candidate,
              x: snapToGrid ? Math.round(clamped.x * 4) / 4 : clamped.x,
              z: snapToGrid ? Math.round(clamped.z * 4) / 4 : clamped.z,
            };
          });
          return;
        }

        const item = primaryItem;
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

        updateItemsTransient([item.id], () => ({
          ...item,
          x: candidate.x,
          y: candidate.y,
          z: candidate.z,
          rotationY: candidate.rotationY,
          scale: candidate.scale,
        }));
      }}
    >
      <group
        ref={targetRef}
        position={[transformCenter.x, transformCenter.y, transformCenter.z]}
        rotation={
          selectedItems.length === 1 ? [0, primaryItem.rotationY, 0] : [0, 0, 0]
        }
        scale={selectedItems.length === 1 ? primaryItem.scale : [1, 1, 1]}
      />
    </TransformControls>
  );
}

function SceneControls({
  orbitRef,
}: {
  orbitRef: React.MutableRefObject<{ enabled: boolean } | null>;
}) {
  const controlsRef = useRef<{ enabled: boolean } | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    orbitRef.current = controlsRef.current;
  }, [orbitRef, controlsRef]);

  return (
    <>
      <OrbitControls
        ref={controlsRef as never}
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

function SelectionBounds({
  project,
  selectedIds,
}: {
  project: Project;
  selectedIds: string[];
}) {
  const selectedItems = project.items.filter((item) => selectedIds.includes(item.id));
  if (selectedItems.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const item of selectedItems) {
    const footprint = getItemFootprint(item);
    minX = Math.min(minX, item.x - footprint.halfWidth);
    maxX = Math.max(maxX, item.x + footprint.halfWidth);
    minZ = Math.min(minZ, item.z - footprint.halfDepth);
    maxZ = Math.max(maxZ, item.z + footprint.halfDepth);
  }

  const width = Math.max(0.8, maxX - minX);
  const depth = Math.max(0.8, maxZ - minZ);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return (
    <group position={[centerX, 0.09, centerZ]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color="#4D96FF" transparent opacity={0.06} />
      </mesh>
      <lineSegments position={[0, 0.01, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width, 0.02, depth)]} />
        <lineBasicMaterial color="#4D96FF" transparent opacity={0.95} />
      </lineSegments>
    </group>
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
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const addItemFromAsset = useEditorStore((s) => s.addItemFromAsset);
  const addConnection = useEditorStore((s) => s.addConnection);
  const updateItemsTransient = useEditorStore((s) => s.updateItemsTransient);
  const commitProjectSnapshot = useEditorStore((s) => s.commitProjectSnapshot);
  const viewportZoom = useEditorStore((s) => s.viewportZoom);
  const orbitRef = useRef<{ enabled: boolean } | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const marqueeStateRef = useRef<MarqueeState | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const project = projectOverride ?? storedProject;

  useEffect(() => {
    if (readOnly) return;
    if (dragStateRef.current) {
      document.body.style.cursor = "grabbing";
    } else if (hoveredId) {
      document.body.style.cursor = toolMode === "select" ? "grab" : "pointer";
    } else if (toolMode === "connect") {
      document.body.style.cursor = "crosshair";
    } else {
      document.body.style.cursor = "default";
    }
    return () => {
      document.body.style.cursor = "default";
    };
  }, [hoveredId, readOnly, toolMode]);

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

  const intersectGround = (ray: THREE.Ray) => {
    const point = new THREE.Vector3();
    return ray.intersectPlane(GROUND_PLANE, point) ? point : null;
  };

  const toggleSelection = (itemId: string) => {
    if (selectedIds.includes(itemId)) {
      setSelectedIds(selectedIds.filter((id) => id !== itemId));
    } else {
      setSelectedIds([...selectedIds, itemId]);
    }
  };

  const beginItemPointer = (
    itemId: string,
    event: {
      shiftKey: boolean;
      ctrlKey: boolean;
      metaKey: boolean;
      altKey: boolean;
      ray: THREE.Ray;
      pointerId: number;
      target: EventTarget;
    },
  ) => {
    if (!project || readOnly) return;

    if (toolMode === "connect") {
      if (selectedIds.length === 1 && selectedIds[0] !== itemId) {
        const source = project.items.find((entry) => entry.id === selectedIds[0]);
        const target = project.items.find((entry) => entry.id === itemId);
        if (source && target) {
          addConnection(source.id, target.id, inferCableType(source, target));
        }
      } else {
        setSelectedIds([itemId]);
      }
      return;
    }

    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    if (additive) {
      toggleSelection(itemId);
      return;
    }

    const startPoint = intersectGround(event.ray);
    if (!startPoint) return;

    const nextSelectedIds = selectedIds.includes(itemId) ? selectedIds : [itemId];
    if (!selectedIds.includes(itemId)) {
      setSelectedIds(nextSelectedIds);
    }

    const originalItems = new Map<string, { x: number; y: number; z: number }>();
    for (const item of project.items) {
      if (nextSelectedIds.includes(item.id)) {
        originalItems.set(item.id, { x: item.x, y: item.y, z: item.z });
      }
    }

    const target = event.target as HTMLElement;
    target.setPointerCapture?.(event.pointerId);
    if (orbitRef.current) orbitRef.current.enabled = false;
    dragStateRef.current = {
      itemId,
      selectedIds: nextSelectedIds,
      startPoint,
      originalItems,
      beforeProject: project,
      didMove: false,
      pointerId: event.pointerId,
      raf: null,
      latestDelta: new THREE.Vector3(),
    };
  };

  const updateDrag = (ray: THREE.Ray) => {
    const state = dragStateRef.current;
    if (!state || !project) return;

    const point = intersectGround(ray);
    if (!point) return;

    const delta = point.clone().sub(state.startPoint);
    if (delta.length() < DRAG_THRESHOLD && !state.didMove) return;

    state.didMove = true;
    state.latestDelta.copy(delta);
    if (state.raf !== null) return;

    state.raf = window.requestAnimationFrame(() => {
      const activeState = dragStateRef.current;
      if (!activeState || !project) return;
      activeState.raf = null;

      let guidesForDrag: AlignmentGuide[] = [];
      const selectedSet = new Set(activeState.selectedIds);
      const others = project.items.filter((item) => !selectedSet.has(item.id));
      const snapToGrid = project.sceneSettings?.snapToGrid ?? true;

      updateItemsTransient(activeState.selectedIds, (item) => {
        const original = activeState.originalItems.get(item.id);
        if (!original) return item;

        const rawCandidate = {
          ...item,
          x: original.x + activeState.latestDelta.x,
          z: original.z + activeState.latestDelta.z,
        };

        const snapped =
          item.id === activeState.itemId
            ? snapPositionToNeighbors(rawCandidate, others)
            : { x: rawCandidate.x, z: rawCandidate.z, guides: [] };
        if (item.id === activeState.itemId) guidesForDrag = snapped.guides;

        const clamped = clampToRoom(
          {
            ...rawCandidate,
            x: snapped.x,
            z: snapped.z,
          },
          project.room,
        );

        const candidate = {
          ...rawCandidate,
          x: snapToGrid ? Math.round(clamped.x * 4) / 4 : clamped.x,
          z: snapToGrid ? Math.round(clamped.z * 4) / 4 : clamped.z,
        };

        if (collidesWithOthers(candidate, others)) return item;
        return candidate;
      });

      setGuides(guidesForDrag);
    });
  };

  const endDrag = () => {
    const state = dragStateRef.current;
    if (!state) return;
    if (state.raf !== null) {
      window.cancelAnimationFrame(state.raf);
    }
    if (state.didMove) {
      commitProjectSnapshot(state.beforeProject);
    }
    dragStateRef.current = null;
    setGuides([]);
    if (orbitRef.current) orbitRef.current.enabled = true;
  };

  const selectByRect = (rect: SelectionRect) => {
    if (!project || !cameraRef.current || !canvasElementRef.current) return;
    const bounds = canvasElementRef.current.getBoundingClientRect();
    const selectedByBox = visibleItems
      .filter((item) => itemFullyInsideRect(item, rect, cameraRef.current!, bounds))
      .map((item) => item.id);

    if (rect.mode === "deselect") {
      setSelectedIds(selectedIds.filter((id) => !selectedByBox.includes(id)));
    } else {
      setSelectedIds(selectedByBox);
    }
  };

  const beginMarquee = (event: { clientX: number; clientY: number; altKey: boolean; shiftKey: boolean }) => {
    const mode = event.altKey && event.shiftKey ? "deselect" : "select";
    marqueeStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      mode,
    };
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
  };

  const updateMarquee = (event: { clientX: number; clientY: number }) => {
    const state = marqueeStateRef.current;
    if (!state) return;
    state.currentX = event.clientX;
    state.currentY = event.clientY;
    const rect = rectFromPoints(
      { x: state.startX, y: state.startY },
      { x: state.currentX, y: state.currentY },
    );
    if (rect.width > POINTER_SELECT_THRESHOLD || rect.height > POINTER_SELECT_THRESHOLD) {
      setSelectionRect({ ...rect, mode: state.mode });
    }
  };

  const endMarquee = () => {
    const state = marqueeStateRef.current;
    const rect = selectionRect;
    marqueeStateRef.current = null;
    pointerDownRef.current = null;

    if (rect && state) {
      selectByRect(rect);
    } else if (!readOnly) {
      clearSelection();
    }
    setSelectionRect(null);
  };

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
        onPointerDown={(event: CanvasPointerEvent) => {
          if (readOnly) return;
          const sourceEvent = event.sourceEvent ?? event.nativeEvent ?? event;
          beginMarquee({
            clientX: sourceEvent.clientX,
            clientY: sourceEvent.clientY,
            altKey: sourceEvent.altKey,
            shiftKey: sourceEvent.shiftKey,
          });
        }}
        onPointerMove={(event: CanvasPointerEvent) => {
          if (readOnly) return;
          const sourceEvent = event.sourceEvent ?? event.nativeEvent ?? event;
          if (dragStateRef.current && event.ray) {
            updateDrag(event.ray);
            return;
          }
          updateMarquee({
            clientX: sourceEvent.clientX,
            clientY: sourceEvent.clientY,
          });
        }}
        onPointerUp={() => {
          if (readOnly) return;
          if (dragStateRef.current) {
            endDrag();
            return;
          }
          if (marqueeStateRef.current) endMarquee();
        }}
      >
        <ViewportBridge cameraRef={cameraRef} elementRef={canvasElementRef} />
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
                selected={!readOnly && selectedIds.includes(item.id)}
                hovered={item.id === hoveredId}
                color={item.color}
                material={item.material}
                onPointerEnter={readOnly ? undefined : () => setHoveredId(item.id)}
                onPointerLeave={readOnly ? undefined : () => setHoveredId((current) => (current === item.id ? null : current))}
                onPointerDown={
                  readOnly
                    ? undefined
                    : (event) => beginItemPointer(item.id, event)
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

          {!readOnly ? (
            <SelectionBounds project={project} selectedIds={selectedIds} />
          ) : null}

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

      {selectionRect ? (
        <div
          className={`pointer-events-none fixed z-40 border ${
            selectionRect.mode === "deselect"
              ? "border-red-400 bg-red-400/10"
              : "border-[#4D96FF] bg-[#4D96FF]/10"
          }`}
          style={{
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height,
          }}
        />
      ) : null}

      {!readOnly ? (
      <div className="pointer-events-none absolute bottom-16 left-6 rounded-[10px] bg-white/92 px-3 py-2 text-[11px] font-medium text-[#687773] shadow-[0_2px_10px_rgba(15,23,42,0.08)]">
        {toolMode === "connect"
          ? "Connect mode: click one AV item, then another to create a cable run."
          : "Mouse: rotate · Scroll: zoom · Shift+drag: pan"}
      </div>
      ) : null}
    </div>
  );
}
