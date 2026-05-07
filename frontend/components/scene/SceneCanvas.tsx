"use client";

import {
  ContactShadows,
  Environment,
  Grid,
  OrbitControls,
  PointerLockControls,
  TransformControls,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  EffectComposer,
  N8AO,
  Bloom,
  ToneMapping,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import {
  XR,
  createXRStore,
  useXR,
  useXRSessionModeSupported,
  type XRStore,
} from "@react-three/xr";
import { BlendFunction, ToneMappingMode } from "postprocessing";
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
  active: boolean;
};

type DragState = {
  itemId: string;
  selectedIds: string[];
  startPoint: THREE.Vector3;
  startClientX: number;
  startClientY: number;
  longPressTimer: number | null;
  originalItems: Map<string, { x: number; y: number; z: number }>;
  beforeProject: Project;
  didMove: boolean;
  armed: boolean;
  pointerId: number;
  raf: number | null;
  latestDelta: THREE.Vector3;
};

type CanvasPointerEvent = React.PointerEvent<HTMLDivElement> & {
  sourceEvent?: PointerEvent;
  ray?: THREE.Ray;
};

const DRAG_INTENT_PX = 3;
const LONG_PRESS_MS = 160;
const MARQUEE_INTENT_PX = 8;
const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function rectFromPoints(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
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
    {
      x: item.x - footprint.halfWidth,
      y: item.y,
      z: item.z - footprint.halfDepth,
    },
    {
      x: item.x + footprint.halfWidth,
      y: item.y,
      z: item.z - footprint.halfDepth,
    },
    {
      x: item.x - footprint.halfWidth,
      y: item.y,
      z: item.z + footprint.halfDepth,
    },
    {
      x: item.x + footprint.halfWidth,
      y: item.y,
      z: item.z + footprint.halfDepth,
    },
  ];

  const center = pointInsideRect(
    projectItemToScreen(item, camera, bounds),
    rect,
  );
  const fullyInside = corners.every((corner) =>
    pointInsideRect(projectItemToScreen(corner, camera, bounds), rect),
  );

  return center || fullyInside;
}

function clampGroupDeltaToRoom(
  selectedItems: Project["items"],
  room: Project["room"],
  delta: THREE.Vector3,
) {
  let nextX = delta.x;
  let nextZ = delta.z;

  for (const item of selectedItems) {
    const footprint = getItemFootprint(item);
    const minX = -room.width / 2 + footprint.halfWidth;
    const maxX = room.width / 2 - footprint.halfWidth;
    const minZ = -room.depth / 2 + footprint.halfDepth;
    const maxZ = room.depth / 2 - footprint.halfDepth;

    nextX = Math.max(nextX, minX - item.x);
    nextX = Math.min(nextX, maxX - item.x);
    nextZ = Math.max(nextZ, minZ - item.z);
    nextZ = Math.min(nextZ, maxZ - item.z);
  }

  return new THREE.Vector3(nextX, 0, nextZ);
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

const RECORDING_DURATION_S = 48;

function WalkthroughRecordingCamera({
  room,
  isRecording,
  onProgress,
  onComplete,
}: {
  room: Project["room"];
  isRecording: boolean;
  onProgress: (t: number) => void;
  onComplete: () => void;
}) {
  const { camera } = useThree();
  const elapsedRef = useRef(0);
  const savedPositionRef = useRef<THREE.Vector3 | null>(null);
  const savedQuaternionRef = useRef<THREE.Quaternion | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (isRecording) {
      savedPositionRef.current = camera.position.clone();
      savedQuaternionRef.current = camera.quaternion.clone();
      elapsedRef.current = 0;
      completedRef.current = false;
    } else {
      if (savedPositionRef.current) {
        camera.position.copy(savedPositionRef.current);
        camera.quaternion.copy(savedQuaternionRef.current!);
      }
    }
  }, [isRecording, camera]);

  useFrame((_, delta) => {
    if (!isRecording) return;

    elapsedRef.current = Math.min(elapsedRef.current + delta, RECORDING_DURATION_S);
    const t = elapsedRef.current / RECORDING_DURATION_S;
    onProgress(t);

    const w = room.width;
    const d = room.depth;
    const h = room.height;
    const EYE = 1.65;
    // Inner bounds — camera stays inside the room
    const iX = w / 2 - 1.1;
    const iZ = d / 2 - 1.1;

    if (t < 0.07) {
      // Phase 1 (0-7%, ~3.4s): brief overhead establishing shot, camera drifts in
      const phase = t / 0.07;
      const camH = Math.max(h + 4, 9);
      const drift = THREE.MathUtils.lerp(Math.max(w, d) * 0.4, 0, phase);
      camera.position.set(drift, camH, drift * 0.6);
      camera.lookAt(0, 0, 0);

    } else if (t < 0.19) {
      // Phase 2 (7-19%, ~5.8s): descend from above into front of room, walk to back
      const phase = (t - 0.07) / 0.12;
      const camH = THREE.MathUtils.lerp(Math.max(h + 4, 9), EYE, Math.min(phase * 1.8, 1));
      const z = THREE.MathUtils.lerp(iZ, -iZ, phase);
      camera.position.set(0, camH, z);
      camera.lookAt(0, EYE * 0.85, z - 5);

    } else if (t < 0.33) {
      // Phase 3 (19-33%, ~6.7s): left-wall pass back→front, looking across the full room width
      const phase = (t - 0.19) / 0.14;
      const z = THREE.MathUtils.lerp(-iZ, iZ, phase);
      camera.position.set(-iX, EYE, z);
      camera.lookAt(iX, EYE * 0.9, z + 1.5);

    } else if (t < 0.47) {
      // Phase 4 (33-47%, ~6.7s): right-wall pass front→back, looking across the full room width
      const phase = (t - 0.33) / 0.14;
      const z = THREE.MathUtils.lerp(iZ, -iZ, phase);
      camera.position.set(iX, EYE, z);
      camera.lookAt(-iX, EYE * 0.9, z - 1.5);

    } else if (t < 0.60) {
      // Phase 5 (47-60%, ~6.2s): center 360° slow spin — all four walls visible
      const phase = (t - 0.47) / 0.13;
      const angle = phase * Math.PI * 2;
      camera.position.set(0, EYE, 0);
      camera.lookAt(Math.sin(angle) * iX, EYE * 0.88, Math.cos(angle) * iZ);

    } else if (t < 0.73) {
      // Phase 6 (60-73%, ~6.2s): diagonal front-left → back-right, angled perspective
      const phase = (t - 0.60) / 0.13;
      const x = THREE.MathUtils.lerp(-iX * 0.8, iX * 0.8, phase);
      const z = THREE.MathUtils.lerp(iZ * 0.8, -iZ * 0.8, phase);
      camera.position.set(x, EYE, z);
      camera.lookAt(x + 2.5, EYE * 0.88, z - 3.5);

    } else if (t < 0.86) {
      // Phase 7 (73-86%, ~6.2s): diagonal back-left → front-right, opposite angle
      const phase = (t - 0.73) / 0.13;
      const x = THREE.MathUtils.lerp(-iX * 0.8, iX * 0.8, phase);
      const z = THREE.MathUtils.lerp(-iZ * 0.8, iZ * 0.8, phase);
      camera.position.set(x, EYE, z);
      camera.lookAt(x + 2.5, EYE * 0.88, z + 3.5);

    } else {
      // Phase 8 (86-100%, ~6.7s): smooth rise to low aerial inside/above room — final reveal
      const phase = (t - 0.86) / 0.14;
      const eased = 1 - Math.pow(1 - phase, 2);
      const lastX = iX * 0.8;
      const lastZ = iZ * 0.8;
      camera.position.set(
        THREE.MathUtils.lerp(lastX, 0, eased),
        THREE.MathUtils.lerp(EYE, Math.max(h * 0.75, 4), eased),
        THREE.MathUtils.lerp(lastZ, 0, eased),
      );
      camera.lookAt(0, 0, 0);
    }

    if (t >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  });

  return null;
}

function SceneReadySignal({ onReady }: { onReady: () => void }) {
  const frameCountRef = useRef(0);

  useFrame(() => {
    frameCountRef.current += 1;
    if (frameCountRef.current === 2) onReady();
  });

  return null;
}

function XRSessionStateSync({
  room,
  onPresentingChange,
}: {
  room: Project["room"];
  onPresentingChange: (presenting: boolean) => void;
}) {
  const mode = useXR((state) => state.mode);
  const { camera } = useThree();

  useEffect(() => {
    const presenting = mode === "immersive-vr";
    onPresentingChange(presenting);
    if (presenting) {
      camera.position.set(0, 1.6, Math.min(room.depth / 2 - 3, 8));
    }
  }, [camera, mode, onPresentingChange, room.depth]);

  return null;
}

function EnterVRButton({ store, hidden }: { store: XRStore; hidden: boolean }) {
  const supported = useXRSessionModeSupported("immersive-vr");
  const [error, setError] = useState("");

  if (hidden || supported !== true) return null;

  return (
    <button
      type="button"
      onClick={() => {
        setError("");
        void store.enterVR().catch(() => {
          setError("VR session could not start.");
        });
      }}
      title={error || "Enter VR"}
      className="absolute right-5 top-[112px] z-20 rounded-[10px] border border-[#5d7f73] bg-[#5d7f73] px-3 py-2 text-[12px] font-bold text-white shadow-[0_2px_10px_rgba(15,23,42,0.12)] transition hover:bg-[#4f7166]"
    >
      Enter VR
    </button>
  );
}

function SceneLoadingOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[#ebe7dd]">
      <div className="relative h-[240px] w-[380px] max-w-[84vw] overflow-hidden rounded-[8px] border border-[#d9d2c5] bg-[#f7f3ea] shadow-[0_18px_64px_rgba(62,52,39,0.18)]">
        <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(#ded6ca_1px,transparent_1px),linear-gradient(90deg,#ded6ca_1px,transparent_1px)] [background-size:26px_26px]" />
        <div className="absolute left-10 top-10 h-32 w-56 border-[5px] border-[#3b332b] bg-[#f5efe4]/70" />
        <div className="absolute left-[62px] top-[72px] grid grid-cols-6 gap-2.5">
          {Array.from({ length: 24 }).map((_, index) => (
            <div
              key={index}
              className="h-3 w-3 rounded-[3px] border border-[#65786f] bg-[#95b39f]"
              style={{
                animation: `venue-loader-pop 1.35s ${index * 0.025}s infinite ease-in-out`,
              }}
            />
          ))}
        </div>
        <div className="absolute bottom-0 inset-x-0 border-t border-[#ded6ca] bg-white/74 px-4 py-3 backdrop-blur">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#ddd5c8]">
            <div className="h-full w-1/2 rounded-full bg-[#5d7f73] [animation:venue-loader-scan_1.35s_infinite_ease-in-out]" />
          </div>
          <div className="mt-2 text-[11px] font-bold uppercase text-[#61736c]">
            Preparing 3D walkthrough
          </div>
        </div>
      </div>
    </div>
  );
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
        <edgesGeometry
          args={[
            new THREE.ConeGeometry(
              2.2,
              4.5,
              24,
              1,
              true,
              -Math.PI / 6,
              Math.PI / 3,
            ),
          ]}
        />
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
  const snapToGrid = useEditorStore(
    (s) => s.project?.sceneSettings?.snapToGrid ?? true,
  );
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
    for (const item of selectedItems)
      center.add(new THREE.Vector3(item.x, item.y, item.z));
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
    toolMode === "connect" ||
    (selectedItems.length > 1 && toolMode !== "move" && toolMode !== "select")
  ) {
    onGuidesChange([]);
    return null;
  }

  return (
    <TransformControls
      ref={transformRef as never}
      mode={
        toolMode === "move" || toolMode === "select" ? "translate" : toolMode
      }
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
  enabled = true,
}: {
  orbitRef: React.MutableRefObject<{ enabled: boolean } | null>;
  enabled?: boolean;
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
        enabled={enabled}
        enablePan
        screenSpacePanning
        rotateSpeed={0.55}
        zoomSpeed={0.72}
        panSpeed={0.82}
        minDistance={6}
        maxDistance={80}
        enableDamping
        dampingFactor={0.08}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        target={[0, 0, 0]}
        camera={camera}
      />
    </>
  );
}

function WalkthroughControls({
  enabled,
  room,
}: {
  enabled: boolean;
  room: Project["room"];
}) {
  const controlsRef = useRef<{ isLocked: boolean; lock: () => void } | null>(
    null,
  );
  const keysRef = useRef(new Set<string>());
  const trackpadVelocityRef = useRef(new THREE.Vector3());
  const lookVelocityRef = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    if (!enabled) return;
    camera.position.set(0, 1.65, Math.min(room.depth / 2 - 3, 8));
    camera.lookAt(0, 1.45, -room.depth / 2 + 3);

    const down = (event: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "KeyQ",
          "KeyE",
          "KeyR",
        ].includes(event.code)
      ) {
        event.preventDefault();
      }

      if (event.code === "KeyR" && !event.repeat) {
        camera.rotation.y += Math.PI;
        return;
      }

      keysRef.current.add(event.code);
    };
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();

      if (event.shiftKey) {
        const deltaModeScale =
          event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1;
        const rawDelta =
          Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY;
        lookVelocityRef.current += THREE.MathUtils.clamp(
          -rawDelta * deltaModeScale * 0.0038,
          -0.9,
          0.9,
        );
        lookVelocityRef.current = THREE.MathUtils.clamp(
          lookVelocityRef.current,
          -2.4,
          2.4,
        );
        return;
      }

      const strafe = new THREE.Vector3()
        .crossVectors(direction, new THREE.Vector3(0, 1, 0))
        .normalize();
      const deltaModeScale =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1;
      const forwardAmount = THREE.MathUtils.clamp(
        -event.deltaY * deltaModeScale * 0.018,
        -2.2,
        2.2,
      );
      const strafeAmount = THREE.MathUtils.clamp(
        event.deltaX * deltaModeScale * 0.014,
        -1.8,
        1.8,
      );

      trackpadVelocityRef.current
        .add(direction.multiplyScalar(forwardAmount))
        .add(strafe.multiplyScalar(strafeAmount));
      trackpadVelocityRef.current.clampLength(0, 4);
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("wheel", wheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("wheel", wheel);
      keysRef.current.clear();
      trackpadVelocityRef.current.set(0, 0, 0);
      lookVelocityRef.current = 0;
    };
  }, [camera, enabled, room.depth]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const speed =
      keysRef.current.has("ShiftLeft") || keysRef.current.has("ShiftRight")
        ? 6
        : 3.2;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    const strafe = new THREE.Vector3()
      .crossVectors(direction, new THREE.Vector3(0, 1, 0))
      .normalize();
    const movement = new THREE.Vector3();

    if (keysRef.current.has("KeyW") || keysRef.current.has("ArrowUp"))
      movement.add(direction);
    if (keysRef.current.has("KeyS") || keysRef.current.has("ArrowDown"))
      movement.sub(direction);
    if (keysRef.current.has("KeyA") || keysRef.current.has("ArrowLeft"))
      movement.sub(strafe);
    if (keysRef.current.has("KeyD") || keysRef.current.has("ArrowRight"))
      movement.add(strafe);
    if (keysRef.current.has("KeyQ")) lookVelocityRef.current += 2.2 * delta;
    if (keysRef.current.has("KeyE")) lookVelocityRef.current -= 2.2 * delta;

    if (movement.lengthSq() > 0) {
      movement.normalize().multiplyScalar(speed * delta);
      camera.position.add(movement);
    }

    if (trackpadVelocityRef.current.lengthSq() > 0.0001) {
      camera.position.add(
        trackpadVelocityRef.current.clone().multiplyScalar(delta * 5.5),
      );
      trackpadVelocityRef.current.multiplyScalar(Math.max(0, 1 - delta * 5.8));
    }

    if (Math.abs(lookVelocityRef.current) > 0.0001) {
      camera.rotation.y += lookVelocityRef.current;
      lookVelocityRef.current *= Math.max(0, 1 - delta * 8.5);
    }

    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      -room.width / 2 + 0.7,
      room.width / 2 - 0.7,
    );
    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z,
      -room.depth / 2 + 0.7,
      room.depth / 2 - 0.7,
    );
    camera.position.y = 1.65;
  });

  return enabled ? (
    <PointerLockControls ref={controlsRef as never} makeDefault />
  ) : null;
}

function VenueLighting({
  room,
  settings,
}: {
  room: Project["room"];
  settings?: Project["sceneSettings"];
}) {
  const mood = settings?.lightingMood ?? "presentation";
  const wedding = mood === "wedding";
  const concert = mood === "concert";
  const chapel = mood === "chapel";
  const isOutdoor = settings?.venueEnvironment === "outdoor";
  const daylight = mood === "daylight" || isOutdoor;
  const warmDirectional = wedding || chapel;

  const ceilingRows = useMemo(() => {
    const columns = Math.max(3, Math.min(6, Math.floor(room.width / 6)));
    return Array.from({ length: columns }).map((_, index) => {
      const x =
        columns === 1
          ? 0
          : -room.width * 0.34 + index * ((room.width * 0.68) / (columns - 1));
      return x;
    });
  }, [room.width]);

  return (
    <>
      <hemisphereLight
        args={[
          daylight ? "#e6f1ff" : warmDirectional ? "#fff3e7" : "#f7efe4",
          daylight ? "#7a8a7e" : "#6b6259",
          settings?.ambientLightIntensity ?? 0.75,
        ]}
      />
      <ambientLight
        intensity={
          warmDirectional ? 0.34 : (settings?.ambientLightIntensity ?? 1) * 0.22
        }
        color={warmDirectional ? "#fff1e0" : "#ffffff"}
      />
      <directionalLight
        position={[room.width * 0.32, room.height + 10, room.depth * 0.28]}
        intensity={
          daylight
            ? 2.7
            : warmDirectional
              ? 1.7
              : (settings?.directionalLightIntensity ?? 1.25)
        }
        color={daylight ? "#fff8ea" : warmDirectional ? "#ffd9b5" : "#ffe5bf"}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-room.width / 1.5}
        shadow-camera-right={room.width / 1.5}
        shadow-camera-top={room.depth / 1.5}
        shadow-camera-bottom={-room.depth / 1.5}
        shadow-bias={0.0001}
        shadow-normalBias={0.02}
      />
      {!isOutdoor
        ? ceilingRows.map((x, index) => (
            <pointLight
              key={x}
              position={[
                x,
                room.height - 0.45,
                index % 2 === 0 ? -room.depth * 0.18 : room.depth * 0.18,
              ]}
              intensity={chapel ? 0.78 : wedding ? 1.08 : 0.95}
              distance={Math.max(room.width, room.depth) * 0.42}
              color={wedding ? "#ffd8bf" : "#fff0d2"}
              castShadow={index % 2 === 0}
              shadow-mapSize-width={512}
              shadow-mapSize-height={512}
            />
          ))
        : null}
      {!isOutdoor
        ? [-1, 1].map((side) => (
            <spotLight
              key={side}
              position={[
                side * room.width * 0.26,
                room.height - 0.2,
                -room.depth * 0.22,
              ]}
              angle={0.42}
              penumbra={0.62}
              intensity={concert ? 3.3 : wedding ? 1.55 : 2.1}
              color={concert ? "#a8c9ff" : "#ffd3a3"}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
          ))
        : null}
      {wedding
        ? [-0.42, -0.14, 0.14, 0.42].map((factor) => (
            <pointLight
              key={factor}
              position={[factor * room.width, 0.45, -room.depth / 2 + 0.8]}
              intensity={0.8}
              distance={6}
              color="#ffb8d2"
            />
          ))
        : null}

      {/* Ceiling rect area light — soft panel coverage over the whole room */}
      {!isOutdoor ? (
        <rectAreaLight
          position={[0, room.height - 0.06, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          width={room.width * 0.62}
          height={room.depth * 0.62}
          intensity={
            concert ? 4.0 : wedding ? 2.2 : chapel ? 1.8 : daylight ? 3.5 : 2.8
          }
          color={
            concert
              ? "#a8c9ff"
              : wedding
                ? "#ffd8bf"
                : chapel
                  ? "#ffe4c8"
                  : "#fff5e8"
          }
        />
      ) : null}

      {/* Side fill rect area lights — soften wall shadows */}
      {!isOutdoor
        ? ([-1, 1] as const).map((side) => (
            <rectAreaLight
              key={side}
              position={[side * room.width * 0.42, room.height * 0.62, 0]}
              rotation={[0, side * (-Math.PI / 2), 0]}
              width={room.depth * 0.55}
              height={room.height * 0.45}
              intensity={concert ? 1.8 : wedding ? 1.0 : 1.2}
              color={concert ? "#6eb0ff" : wedding ? "#ffcfa3" : "#fff5e8"}
            />
          ))
        : null}
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
  const selectedItems = project.items.filter((item) =>
    selectedIds.includes(item.id),
  );
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

function PostProcessingEffects({
  settings,
  isXRPresenting,
}: {
  settings?: Project["sceneSettings"];
  isXRPresenting: boolean;
}) {
  const mood = settings?.lightingMood ?? "presentation";
  const concert = mood === "concert";
  const wedding = mood === "wedding";
  const daylight =
    mood === "daylight" || settings?.venueEnvironment === "outdoor";

  if (isXRPresenting) return null;

  return (
    <EffectComposer multisampling={4}>
      <N8AO
        halfRes
        aoSamples={16}
        denoiseSamples={8}
        denoiseRadius={12}
        aoRadius={0.5}
        distanceFalloff={1.0}
        intensity={concert ? 3 : 5}
      />
      <Bloom
        intensity={concert ? 1.4 : wedding ? 0.8 : daylight ? 0.25 : 0.45}
        luminanceThreshold={concert ? 0.7 : 0.88}
        luminanceSmoothing={0.025}
        mipmapBlur
        radius={0.4}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette
        offset={0.35}
        darkness={concert ? 0.65 : wedding ? 0.35 : 0.4}
        blendFunction={BlendFunction.NORMAL}
      />
      <SMAA />
    </EffectComposer>
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
  const xrStore = useMemo(() => createXRStore(), []);
  const orbitRef = useRef<{ enabled: boolean } | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const marqueeStateRef = useRef<MarqueeState | null>(null);
  const selectionRectRef = useRef<SelectionRect | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null,
  );
  const [sceneReady, setSceneReady] = useState(false);
  const [isObjectDragging, setIsObjectDragging] = useState(false);
  const [isXRPresenting, setIsXRPresenting] = useState(false);
  const [hdriError, setHdriError] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const project = projectOverride ?? storedProject;

  const startRecording = () => {
    const canvas = canvasElementRef.current;
    if (!canvas || isRecording || !project) return;

    // MediaRecorder's "video/mp4" produces fragmented MP4 (fMP4) which most
    // media players cannot open. Always prefer WebM — it's reliably playable.
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

    let stream: MediaStream;
    try {
      stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
    } catch {
      return;
    }

    recordingChunksRef.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = "webm";
      a.download = `${project?.name ?? "venue"}-walkthrough.${ext}`;
      a.href = url;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(200);
    clearSelection();
    setIsRecording(true);
    setRecordingProgress(0);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingProgress(0);
  };

  useEffect(() => {
    setSceneReady(false);
  }, [project?.id, activeLayer, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    if (isObjectDragging) {
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
  }, [hoveredId, isObjectDragging, readOnly, toolMode]);

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
      clientX: number;
      clientY: number;
      target: EventTarget;
    },
  ) => {
    if (!project || readOnly) return;

    if (toolMode === "connect") {
      if (selectedIds.length === 1 && selectedIds[0] !== itemId) {
        const source = project.items.find(
          (entry) => entry.id === selectedIds[0],
        );
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

    const nextSelectedIds = selectedIds.includes(itemId)
      ? selectedIds
      : [itemId];
    if (!selectedIds.includes(itemId)) {
      setSelectedIds(nextSelectedIds);
    }

    const originalItems = new Map<
      string,
      { x: number; y: number; z: number }
    >();
    for (const item of project.items) {
      if (nextSelectedIds.includes(item.id)) {
        originalItems.set(item.id, { x: item.x, y: item.y, z: item.z });
      }
    }

    const target = event.target as HTMLElement;
    target.setPointerCapture?.(event.pointerId);
    if (orbitRef.current) orbitRef.current.enabled = false;
    setIsObjectDragging(true);
    dragStateRef.current = {
      itemId,
      selectedIds: nextSelectedIds,
      startPoint,
      startClientX: event.clientX,
      startClientY: event.clientY,
      longPressTimer: window.setTimeout(() => {
        const activeState = dragStateRef.current;
        if (!activeState || activeState.pointerId !== event.pointerId) return;
        activeState.armed = true;
        setIsObjectDragging(true);
      }, LONG_PRESS_MS),
      originalItems,
      beforeProject: project,
      didMove: false,
      armed: false,
      pointerId: event.pointerId,
      raf: null,
      latestDelta: new THREE.Vector3(),
    };
  };

  const updateDrag = (
    ray: THREE.Ray,
    pointer: { clientX: number; clientY: number },
  ) => {
    const state = dragStateRef.current;
    if (!state || !project) return;

    const intentDistance = Math.hypot(
      pointer.clientX - state.startClientX,
      pointer.clientY - state.startClientY,
    );
    if (intentDistance < DRAG_INTENT_PX && !state.didMove && !state.armed)
      return;
    state.armed = true;
    if (state.longPressTimer !== null) {
      window.clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    const point = intersectGround(ray);
    if (!point) return;

    state.didMove = true;
    state.latestDelta.copy(point.clone().sub(state.startPoint));
    if (state.raf !== null) return;

    state.raf = window.requestAnimationFrame(() => {
      const activeState = dragStateRef.current;
      if (!activeState || !project) return;
      activeState.raf = null;

      let guidesForDrag: AlignmentGuide[] = [];
      const selectedSet = new Set(activeState.selectedIds);
      const selectedItems = project.items.filter((item) =>
        selectedSet.has(item.id),
      );
      const others = project.items.filter((item) => !selectedSet.has(item.id));
      const constrainedDelta = clampGroupDeltaToRoom(
        selectedItems,
        project.room,
        activeState.latestDelta,
      );
      const candidates = new Map<string, Project["items"][number]>();
      let finalDelta = constrainedDelta.clone();
      const anchorItem = project.items.find(
        (item) => item.id === activeState.itemId,
      );
      const anchorOriginal = activeState.originalItems.get(activeState.itemId);

      if (anchorItem && anchorOriginal) {
        const rawAnchor = {
          ...anchorItem,
          x: anchorOriginal.x + constrainedDelta.x,
          z: anchorOriginal.z + constrainedDelta.z,
        };
        const snapped = snapPositionToNeighbors(rawAnchor, others);
        guidesForDrag = snapped.guides;
        finalDelta = new THREE.Vector3(
          constrainedDelta.x + (snapped.x - rawAnchor.x),
          0,
          constrainedDelta.z + (snapped.z - rawAnchor.z),
        );
        finalDelta = clampGroupDeltaToRoom(
          selectedItems,
          project.room,
          finalDelta,
        );
      }

      for (const item of selectedItems) {
        const original = activeState.originalItems.get(item.id);
        if (!original) continue;

        candidates.set(item.id, {
          ...item,
          x: original.x + finalDelta.x,
          z: original.z + finalDelta.z,
        });
      }

      const groupBlocked = selectedItems.some((item) => {
        const candidate = candidates.get(item.id);
        return candidate ? collidesWithOthers(candidate, others) : false;
      });

      updateItemsTransient(activeState.selectedIds, (item) =>
        groupBlocked ? item : (candidates.get(item.id) ?? item),
      );

      setGuides(guidesForDrag);
    });
  };

  const endDrag = () => {
    const state = dragStateRef.current;
    if (!state) return;
    if (state.raf !== null) {
      window.cancelAnimationFrame(state.raf);
    }
    if (state.longPressTimer !== null) {
      window.clearTimeout(state.longPressTimer);
    }
    if (state.didMove) {
      commitProjectSnapshot(state.beforeProject);
    }
    dragStateRef.current = null;
    setGuides([]);
    if (orbitRef.current) orbitRef.current.enabled = true;
    setIsObjectDragging(false);
  };

  const selectByRect = (rect: SelectionRect) => {
    if (!project || !cameraRef.current || !canvasElementRef.current) return;
    const bounds = canvasElementRef.current.getBoundingClientRect();
    const selectedByBox = visibleItems
      .filter((item) =>
        itemFullyInsideRect(item, rect, cameraRef.current!, bounds),
      )
      .map((item) => item.id);

    if (rect.mode === "deselect") {
      setSelectedIds(selectedIds.filter((id) => !selectedByBox.includes(id)));
    } else {
      setSelectedIds(selectedByBox);
    }
  };

  const beginMarquee = (event: {
    clientX: number;
    clientY: number;
    altKey: boolean;
    shiftKey: boolean;
  }) => {
    const mode = event.altKey && event.shiftKey ? "deselect" : "select";
    if (orbitRef.current) orbitRef.current.enabled = false;
    marqueeStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      mode,
      active: false,
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

    if (!state.active) {
      const intentDistance = Math.hypot(
        state.currentX - state.startX,
        state.currentY - state.startY,
      );
      if (intentDistance < MARQUEE_INTENT_PX) return;
      state.active = true;
    }

    const nextRect = { ...rect, mode: state.mode };
    selectionRectRef.current = nextRect;
    setSelectionRect(nextRect);
  };

  const endMarquee = () => {
    const state = marqueeStateRef.current;
    const rect = selectionRectRef.current;
    marqueeStateRef.current = null;
    pointerDownRef.current = null;
    selectionRectRef.current = null;

    if (rect && state?.active) {
      selectByRect(rect);
    } else if (!readOnly) {
      clearSelection();
    }
    setSelectionRect(null);
    if (orbitRef.current) orbitRef.current.enabled = true;
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
        shadows={{ type: THREE.VSMShadowMap }}
        gl={{
          antialias: false,
          toneMapping: THREE.NoToneMapping,
          localClippingEnabled: true,
        }}
        camera={{
          position: [18 / viewportZoom, 14 / viewportZoom, 18 / viewportZoom],
          fov: 50,
        }}
        onPointerDown={(event: CanvasPointerEvent) => {
          if (readOnly) return;
          if (settings?.cameraMode === "walkthrough") return;
          const sourceEvent = event.sourceEvent ?? event.nativeEvent ?? event;
          if (!sourceEvent.shiftKey && !sourceEvent.altKey) return;
          beginMarquee({
            clientX: sourceEvent.clientX,
            clientY: sourceEvent.clientY,
            altKey: sourceEvent.altKey,
            shiftKey: sourceEvent.shiftKey,
          });
        }}
        onPointerMove={(event: CanvasPointerEvent) => {
          if (readOnly) return;
          if (settings?.cameraMode === "walkthrough") return;
          const sourceEvent = event.sourceEvent ?? event.nativeEvent ?? event;
          if (dragStateRef.current && event.ray) {
            updateDrag(event.ray, {
              clientX: sourceEvent.clientX,
              clientY: sourceEvent.clientY,
            });
            return;
          }
          if (!marqueeStateRef.current) return;
          updateMarquee({
            clientX: sourceEvent.clientX,
            clientY: sourceEvent.clientY,
          });
        }}
        onPointerUp={() => {
          if (readOnly) return;
          if (settings?.cameraMode === "walkthrough") return;
          if (dragStateRef.current) {
            endDrag();
            return;
          }
          if (marqueeStateRef.current) {
            endMarquee();
            return;
          }
        }}
      >
        <XR store={xrStore}>
          <XRSessionStateSync
            room={project.room}
            onPresentingChange={setIsXRPresenting}
          />
          <SceneReadySignal
            key={`${project.id}-${activeLayer}-${readOnly ? "preview" : "main"}`}
            onReady={() => setSceneReady(true)}
          />
          <ViewportBridge cameraRef={cameraRef} elementRef={canvasElementRef} />
          <VenueLighting room={project.room} settings={settings} />

          <Suspense fallback={null}>
            {settings?.enableHdri !== false && !hdriError ? (
              <Environment
                preset={
                  settings?.venueEnvironment === "outdoor"
                    ? "park"
                    : settings?.lightingMood === "wedding"
                      ? "sunset"
                      : settings?.lightingMood === "chapel"
                        ? "apartment"
                        : settings?.lightingMood === "concert"
                          ? "warehouse"
                          : "city"
                }
                onError={() => setHdriError(true)}
              />
            ) : null}
            {settings?.showGrid !== false &&
            settings?.presentationMode !== true &&
            settings?.cameraMode !== "walkthrough" ? (
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
                project.room.wallThickness ??
                project.sceneSettings?.wallThickness
              }
              wallColor={project.sceneSettings?.wallColor}
              floorColor={project.sceneSettings?.floorColor}
              settings={project.sceneSettings}
              architecture={project.architecture}
            />

            {!isXRPresenting ? (
              <ContactShadows
                position={[0, 0.015, 0]}
                width={project.room.width * 1.1}
                height={project.room.depth * 1.1}
                far={project.room.height}
                blur={2.2}
                opacity={settings?.lightingMood === "concert" ? 0.55 : 0.45}
                color="#1a1208"
                frames={1}
              />
            ) : null}

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
                          cablePoints.flatMap((point) => [
                            point.x,
                            0.08,
                            point.z,
                          ]),
                        ),
                        3,
                      ]}
                    />
                  </bufferGeometry>
                  <lineBasicMaterial
                    color={getCableColor(connection.cableType)}
                  />
                </line>
              );
            })}

            {visibleItems.map((item) => (
              <group key={item.id}>
                <PrimitiveAsset
                  url={item.assetUrl}
                  type={item.type}
                  position={[item.x, item.y, item.z]}
                  rotation={[0, item.rotationY, 0]}
                  scale={item.scale}
                  selected={!readOnly && selectedIds.includes(item.id)}
                  hovered={item.id === hoveredId}
                  color={item.color}
                  material={item.material}
                  onPointerEnter={
                    readOnly ? undefined : () => setHoveredId(item.id)
                  }
                  onPointerLeave={
                    readOnly
                      ? undefined
                      : () =>
                          setHoveredId((current) =>
                            current === item.id ? null : current,
                          )
                  }
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

            <WalkthroughRecordingCamera
              room={project.room}
              isRecording={isRecording}
              onProgress={setRecordingProgress}
              onComplete={stopRecording}
            />
            <SceneControls
              orbitRef={orbitRef}
              enabled={
                !isXRPresenting &&
                !isRecording &&
                settings?.cameraMode !== "walkthrough"
              }
            />
            <WalkthroughControls
              enabled={
                !isXRPresenting &&
                !isRecording &&
                settings?.cameraMode === "walkthrough"
              }
              room={project.room}
            />
            {!readOnly && !isXRPresenting ? (
              <TransformGizmo
                project={project}
                orbitRef={orbitRef}
                onGuidesChange={setGuides}
              />
            ) : null}
            <PostProcessingEffects
              settings={settings}
              isXRPresenting={isXRPresenting}
            />
          </Suspense>
        </XR>
      </Canvas>

      {!sceneReady ? <SceneLoadingOverlay /> : null}

      <EnterVRButton store={xrStore} hidden={readOnly} />

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
          {isRecording
            ? "Recording walkthrough — camera animates automatically…"
            : settings?.cameraMode === "walkthrough"
              ? "Walkthrough: WASD/arrows move · Q/E turn · R looks back · Shift+trackpad turns."
              : toolMode === "connect"
                ? "Connect mode: click one AV item, then another to create a cable run."
                : "Drag empty space to rotate · scroll to zoom · right-drag pans · Shift-drag selects many"}
        </div>
      ) : null}

      {!readOnly && !isXRPresenting ? (
        <div className="absolute bottom-5 right-5 z-20 flex flex-col items-end gap-2">
          {isRecording ? (
            <>
              <div className="flex items-center gap-2 rounded-[10px] bg-red-600 px-3 py-2 text-[12px] font-bold text-white shadow-[0_2px_10px_rgba(15,23,42,0.18)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                REC {Math.round(recordingProgress * 100)}%
              </div>
              <div className="h-1.5 w-44 overflow-hidden rounded-full bg-white/60 shadow-inner">
                <div
                  className="h-full rounded-full bg-red-500 transition-all duration-200"
                  style={{ width: `${recordingProgress * 100}%` }}
                />
              </div>
              <button
                onClick={stopRecording}
                className="rounded-[10px] border border-red-300 bg-white px-3 py-2 text-[12px] font-bold text-red-600 shadow-[0_2px_10px_rgba(15,23,42,0.12)] transition hover:bg-red-50"
              >
                Stop &amp; Save Video
              </button>
            </>
          ) : (
            <button
              onClick={startRecording}
              className="rounded-[10px] border border-[#5d7f73] bg-white px-3 py-2 text-[12px] font-bold text-[#5d7f73] shadow-[0_2px_10px_rgba(15,23,42,0.12)] transition hover:bg-[#f0f8f5]"
              title="Record a 48-second cinematic walkthrough video — explores all angles inside the venue"
            >
              Record Walkthrough Video
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
