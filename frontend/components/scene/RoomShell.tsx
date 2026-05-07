"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
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

type TexturePair = { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };

function configTex(canvas: HTMLCanvasElement, repeat: number, anisotropy = 16): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = anisotropy;
  return tex;
}

function makeFloorTexture(kind: string, base: string): TexturePair | null {
  if (typeof document === "undefined") return null;
  const S = 1024, B = 512;
  const cc = document.createElement("canvas"); cc.width = S; cc.height = S;
  const c = cc.getContext("2d")!;
  const bc = document.createElement("canvas"); bc.width = B; bc.height = B;
  const b = bc.getContext("2d")!;
  c.fillStyle = base; c.fillRect(0, 0, S, S);
  b.fillStyle = "#888"; b.fillRect(0, 0, B, B);
  const sc = B / S;

  if (kind === "Wood") {
    const pw = 88, ph = 280;
    let seed = 37;
    const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0x100000000; };
    for (let row = -1; row <= Math.ceil(S / ph) + 1; row++) {
      for (let col = -1; col <= Math.ceil(S / pw); col++) {
        const ox = row % 2 === 0 ? 0 : pw / 2;
        const x = col * pw + ox, y = row * ph;
        // plank color variation
        const lv = rng() * 0.14 - 0.07;
        c.fillStyle = lv > 0 ? `rgba(255,255,255,${lv * 0.9})` : `rgba(0,0,0,${-lv * 0.9})`;
        c.fillRect(x + 1, y + 1, pw - 2, ph - 2);
        // grain
        const gc = 5 + Math.floor(rng() * 4);
        for (let g = 0; g < gc; g++) {
          const gy = y + (g / gc) * ph, amp = rng() * 4;
          c.strokeStyle = `rgba(55,35,14,${0.04 + rng() * 0.06})`; c.lineWidth = 0.7;
          c.beginPath(); c.moveTo(x, gy);
          c.bezierCurveTo(x + pw * 0.35, gy + amp, x + pw * 0.7, gy - amp, x + pw, gy + amp * 0.5);
          c.stroke();
        }
        // knots
        if (rng() < 0.12) {
          const kx = x + pw * (0.25 + rng() * 0.5), ky = y + ph * (0.2 + rng() * 0.6);
          c.strokeStyle = "rgba(50,28,10,0.24)";
          for (let k = 1; k <= 4; k++) { c.lineWidth = 0.6; c.beginPath(); c.ellipse(kx, ky, k * 5, k * 2.5, rng() * 0.5, 0, Math.PI * 2); c.stroke(); }
          b.fillStyle = "rgba(170,170,170,0.45)"; b.beginPath(); b.ellipse(kx * sc, ky * sc, 12 * sc, 8 * sc, 0, 0, Math.PI * 2); b.fill();
        }
        // gap lines
        c.fillStyle = "rgba(22,12,5,0.62)"; c.fillRect(x + pw - 1, y, 1, ph); c.fillRect(x, y + ph - 1, pw, 1);
        b.fillStyle = "rgba(48,48,48,0.72)"; b.fillRect((x + pw - 2) * sc, y * sc, 2 * sc, ph * sc); b.fillRect(x * sc, (y + ph - 2) * sc, pw * sc, 2 * sc);
        b.fillStyle = "rgba(152,152,152,0.22)"; b.fillRect((x + 3) * sc, (y + 3) * sc, (pw - 6) * sc, (ph - 6) * sc);
      }
    }
    return { map: configTex(cc, 6), bumpMap: configTex(bc, 6) };
  }

  if (kind === "Marble") {
    const gr = c.createLinearGradient(0, 0, S, S);
    gr.addColorStop(0, base); gr.addColorStop(0.45, "#f9f5ee"); gr.addColorStop(1, base);
    c.fillStyle = gr; c.fillRect(0, 0, S, S);
    // large veins
    c.strokeStyle = "rgba(148,138,124,0.22)"; c.lineWidth = 4;
    for (let v = 0; v < 4; v++) {
      c.beginPath(); c.moveTo(Math.random() * S, Math.random() * 120);
      c.bezierCurveTo(Math.random() * S, S * 0.3 + Math.random() * 180, Math.random() * S, S * 0.6 + Math.random() * 180, Math.random() * S, S - Math.random() * 120);
      c.stroke();
    }
    // secondary veins
    c.strokeStyle = "rgba(118,112,100,0.13)"; c.lineWidth = 1.5;
    for (let v = 0; v < 14; v++) {
      c.beginPath(); c.moveTo(Math.random() * S, Math.random() * S);
      c.bezierCurveTo(Math.random() * S, Math.random() * S, Math.random() * S, Math.random() * S, Math.random() * S, Math.random() * S); c.stroke();
    }
    // micro veins
    c.strokeStyle = "rgba(95,90,80,0.07)"; c.lineWidth = 0.8;
    for (let v = 0; v < 28; v++) { c.beginPath(); c.moveTo(Math.random() * S, Math.random() * S); c.lineTo(Math.random() * S, Math.random() * S); c.stroke(); }
    // sparkle
    for (let i = 0; i < 120; i++) {
      const gx = Math.random() * S, gy = Math.random() * S;
      const grd = c.createRadialGradient(gx, gy, 0, gx, gy, 1.5);
      grd.addColorStop(0, "rgba(255,255,255,0.22)"); grd.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = grd; c.beginPath(); c.arc(gx, gy, 1.5, 0, Math.PI * 2); c.fill();
    }
    // vein bump
    b.strokeStyle = "rgba(100,100,100,0.45)"; b.lineWidth = 3;
    for (let v = 0; v < 4; v++) {
      b.beginPath(); b.moveTo(Math.random() * B, Math.random() * 80);
      b.bezierCurveTo(Math.random() * B, B * 0.3 + Math.random() * 100, Math.random() * B, B * 0.6 + Math.random() * 100, Math.random() * B, B - Math.random() * 80); b.stroke();
    }
    return { map: configTex(cc, 4), bumpMap: configTex(bc, 4) };
  }

  if (kind === "Carpet" || kind === "Banquet") {
    for (let y = 0; y < S; y += 3) {
      c.strokeStyle = `rgba(${y % 6 === 0 ? "38,28,18" : "220,212,202"},${y % 6 === 0 ? 0.09 : 0.06})`; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, y + Math.sin(y * 0.5) * 1); c.lineTo(S, y + Math.sin(y * 0.5 + 2) * 1); c.stroke();
    }
    for (let x = 0; x < S; x += 3) {
      c.strokeStyle = "rgba(55,44,34,0.04)"; c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(x + Math.sin(x * 0.3) * 1, 0); c.lineTo(x + Math.sin(x * 0.3 + 1) * 1, S); c.stroke();
    }
    if (kind === "Banquet") {
      c.strokeStyle = "rgba(145,90,72,0.15)"; c.lineWidth = 1.5;
      for (let d = -S; d < S * 2; d += 52) { c.beginPath(); c.moveTo(d, 0); c.lineTo(d + S, S); c.stroke(); c.beginPath(); c.moveTo(d, S); c.lineTo(d + S, 0); c.stroke(); }
    }
    for (let py = 0; py < B; py += 2) { for (let px = 0; px < B; px += 2) { const v = 108 + Math.floor(Math.random() * 82); b.fillStyle = `rgb(${v},${v},${v})`; b.fillRect(px, py, 2, 2); } }
    return { map: configTex(cc, 6), bumpMap: configTex(bc, 6) };
  }

  if (kind === "Concrete") {
    const cg = c.createRadialGradient(S * 0.4, S * 0.35, 0, S * 0.5, S * 0.5, S * 0.75);
    cg.addColorStop(0, "#d8d5cc"); cg.addColorStop(1, base);
    c.fillStyle = cg; c.fillRect(0, 0, S, S);
    for (let i = 0; i < 2400; i++) {
      const x = Math.random() * S, y = Math.random() * S, r = 0.4 + Math.random() * 2;
      c.fillStyle = Math.random() > 0.58 ? `rgba(210,205,195,${0.1 + Math.random() * 0.1})` : `rgba(58,54,48,${0.07 + Math.random() * 0.1})`;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = "rgba(155,150,142,0.07)";
    for (let i = 0; i < 6; i++) { c.lineWidth = 5 + Math.random() * 5; c.beginPath(); c.arc(Math.random() * S, Math.random() * S, 90 + Math.random() * 140, 0, Math.PI * 0.45); c.stroke(); }
    c.strokeStyle = "rgba(78,72,64,0.22)"; c.lineWidth = 0.8;
    for (let cr = 0; cr < 2; cr++) { let cx = Math.random() * S, cy = Math.random() * S; c.beginPath(); c.moveTo(cx, cy); for (let s = 0; s < 7; s++) { cx += (Math.random() - 0.5) * 90; cy += (Math.random() - 0.5) * 90; c.lineTo(cx, cy); } c.stroke(); }
    for (let i = 0; i < 1000; i++) { const x = Math.random() * B, y = Math.random() * B, r = 0.5 + Math.random() * 2.5; const v = 98 + Math.floor(Math.random() * 82); b.fillStyle = `rgb(${v},${v},${v})`; b.beginPath(); b.arc(x, y, r, 0, Math.PI * 2); b.fill(); }
    return { map: configTex(cc, 5), bumpMap: configTex(bc, 5) };
  }

  // Tiles (default)
  const tS = 92, grout = 5;
  c.fillStyle = "rgba(108,102,95,1)"; c.fillRect(0, 0, S, S);
  b.fillStyle = "#5e5e5e"; b.fillRect(0, 0, B, B);
  for (let ty = 0; ty * tS < S + tS; ty++) {
    for (let tx = 0; tx * tS < S + tS; tx++) {
      const x = tx * tS, y = ty * tS, iw = tS - grout * 2, ih = tS - grout * 2;
      c.fillStyle = base; c.fillRect(x + grout, y + grout, iw, ih);
      const vr = Math.random() * 0.07 - 0.035;
      c.fillStyle = vr > 0 ? `rgba(255,255,255,${vr})` : `rgba(0,0,0,${-vr})`; c.fillRect(x + grout, y + grout, iw, ih);
      c.fillStyle = "rgba(255,255,255,0.07)"; c.fillRect(x + grout + 2, y + grout + 2, iw * 0.35, ih * 0.25);
      b.fillStyle = "#aaa"; b.fillRect((x + grout) * sc, (y + grout) * sc, iw * sc, ih * sc);
    }
  }
  return { map: configTex(cc, 8), bumpMap: configTex(bc, 8) };
}

function makeWallTexture(kind: string, base: string): TexturePair | null {
  if (typeof document === "undefined") return null;
  const S = 512;
  const cc = document.createElement("canvas"); cc.width = S; cc.height = S;
  const c = cc.getContext("2d")!;
  const bc = document.createElement("canvas"); bc.width = S; bc.height = S;
  const b = bc.getContext("2d")!;
  c.fillStyle = base; c.fillRect(0, 0, S, S);
  b.fillStyle = "#888"; b.fillRect(0, 0, S, S);

  if (kind === "Draping") {
    for (let y = 0; y < S; y += 12) {
      c.strokeStyle = `rgba(60,50,40,${0.07 + Math.sin(y * 0.1) * 0.03})`; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, y + Math.sin(y * 0.08) * 3);
      c.bezierCurveTo(S * 0.33, y + Math.sin(y * 0.05) * 5, S * 0.66, y + Math.sin(y * 0.05 + 1) * 5, S, y + Math.sin(y * 0.08 + 0.5) * 3); c.stroke();
      const bv = 140 + Math.floor(Math.sin(y * 0.1) * 30);
      b.strokeStyle = `rgb(${bv},${bv},${bv})`; b.lineWidth = 8;
      b.beginPath(); b.moveTo(0, y + Math.sin(y * 0.08) * 3); b.lineTo(S, y + Math.sin(y * 0.08 + 0.5) * 3); b.stroke();
    }
    return { map: configTex(cc, 4), bumpMap: configTex(bc, 4, 8) };
  }

  // Default painted plaster
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = 0.5 + Math.random() * 1.8;
    c.fillStyle = `rgba(255,255,255,${0.025 + Math.random() * 0.035})`; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  for (let y = 0; y < S; y += 24) {
    c.strokeStyle = `rgba(190,184,176,${0.03 + Math.sin(y * 0.18) * 0.015})`; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(0, y + Math.sin(y * 0.14) * 2); c.lineTo(S, y + Math.sin(y * 0.14 + 0.9) * 2); c.stroke();
  }
  for (let i = 0; i < 350; i++) { const x = Math.random() * S, y = Math.random() * S, r = 1 + Math.random() * 3.5; const v = 118 + Math.floor(Math.random() * 52); b.fillStyle = `rgb(${v},${v},${v})`; b.beginPath(); b.arc(x, y, r, 0, Math.PI * 2); b.fill(); }
  return { map: configTex(cc, 4), bumpMap: configTex(bc, 4, 8) };
}

function useVenueMaterials(settings?: SceneSettings, floorColor = "#F4F1EA", wallColor = "#F6F2EC") {
  return useMemo(() => {
    const floorMaterial = settings?.floorMaterial ?? "Wood";
    const wedding = settings?.lightingMood === "wedding";
    const resolvedFloorColor = wedding && floorMaterial !== "Concrete" ? "#ead8c2" : floorColor;
    const resolvedWallColor = wedding ? "#f5ece3" : wallColor;

    const floorBase =
      floorMaterial === "Carpet" ? "#7f7268"
      : floorMaterial === "Marble" ? "#e7e4dc"
      : floorMaterial === "Concrete" ? "#c9c7c0"
      : floorMaterial === "Tiles" ? "#dedbd2"
      : resolvedFloorColor;
    const floorTex = makeFloorTexture(floorMaterial, floorBase);

    const wallKind = settings?.wallMaterial === "Draping" ? "Draping" : "Default";
    const wallTex = makeWallTexture(wallKind, resolvedWallColor);

    return {
      floor: new THREE.MeshStandardMaterial({
        color: resolvedFloorColor,
        map: floorTex?.map,
        bumpMap: floorTex?.bumpMap,
        bumpScale:
          floorMaterial === "Carpet" || floorMaterial === "Banquet" ? 0.006
          : floorMaterial === "Tiles" ? 0.018
          : floorMaterial === "Wood" ? 0.012
          : floorMaterial === "Concrete" ? 0.01
          : 0.008,
        roughness: floorMaterial === "Marble" ? 0.18 : floorMaterial === "Concrete" ? 0.88 : floorMaterial === "Tiles" ? 0.22 : 0.62,
        metalness: floorMaterial === "Marble" ? 0.06 : 0.02,
        envMapIntensity: floorMaterial === "Marble" ? 0.78 : floorMaterial === "Tiles" ? 0.42 : wedding ? 0.32 : 0.18,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: resolvedWallColor,
        map: wallTex?.map,
        bumpMap: wallTex?.bumpMap,
        bumpScale: wallKind === "Draping" ? 0.016 : 0.004,
        roughness: settings?.wallMaterial === "LED Backdrop" ? 0.32 : 0.88,
        metalness: settings?.wallMaterial === "Decorative" ? 0.06 : 0.01,
        side: THREE.FrontSide,
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: wedding ? "#fbf4ec" : "#f5f1ea",
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
  }, [floorColor, settings?.floorMaterial, settings?.lightingMood, settings?.wallMaterial, wallColor]);
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

function AdaptiveWallVisibility({
  materials,
  walls,
  width,
  depth,
  wallThickness,
}: {
  materials: THREE.MeshStandardMaterial[];
  walls: WallDefinition[];
  width: number;
  depth: number;
  wallThickness: number;
}) {
  const { camera } = useThree();

  const clippingPlanes = useMemo(
    () =>
      walls.map((wall) => {
        const inward = wall.normal.clone().negate();
        const halfDim = wall.key === "north" || wall.key === "south" ? depth / 2 : width / 2;
        // Plane clips the wall geometry (at halfDim) while leaving room interior untouched
        return new THREE.Plane(inward, halfDim - wallThickness);
      }),
    [walls, width, depth, wallThickness],
  );

  useFrame(() => {
    const cam = camera.position;
    const insideRoom = Math.abs(cam.x) < width / 2 + 0.8 && Math.abs(cam.z) < depth / 2 + 0.8;

    walls.forEach((wall, index) => {
      const mat = materials[index];
      if (!mat) return;

      if (!insideRoom) {
        mat.clippingPlanes = [];
        return;
      }

      const wallCenter = new THREE.Vector3(...wall.center);
      const facingCamera = cam.clone().sub(wallCenter).normalize().dot(wall.normal);

      // Clip when camera is on the interior side of this wall
      if (facingCamera > 0.18) {
        mat.clippingPlanes = [];
      } else {
        mat.clippingPlanes = [clippingPlanes[index]];
      }
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

function WindowLighting({ width, depth, height, architecture }: { width: number; depth: number; height: number; architecture: VenueArchitecture }) {
  if (architecture.windows.length === 0) return null;

  const toPosition = (opening: VenueOpening): [number, number, number] => {
    const y = (opening.sillHeight ?? 1) + opening.height * 0.7;
    if (opening.wall === "north") return [opening.offset, y, -depth / 2 + 0.35];
    if (opening.wall === "south") return [opening.offset, y, depth / 2 - 0.35];
    if (opening.wall === "east") return [width / 2 - 0.35, y, opening.offset];
    return [-width / 2 + 0.35, y, opening.offset];
  };

  return (
    <>
      {architecture.windows.map((window) => {
        const position = toPosition(window);
        return (
          <group key={`window-light-${window.id}`}>
            <pointLight
              position={position}
              intensity={0.48}
              distance={Math.max(width, depth) * 0.24}
              color="#ffe8c8"
            />
            <pointLight
              position={[position[0], Math.min(height - 0.4, position[1] + 0.35), position[2]]}
              intensity={0.22}
              distance={Math.max(width, depth) * 0.18}
              color="#fff5e5"
            />
          </group>
        );
      })}
    </>
  );
}

function FloorMesh({
  width,
  depth,
  material,
  floorType,
}: {
  width: number;
  depth: number;
  material: THREE.MeshStandardMaterial;
  floorType: string;
}) {
  const reflective = floorType === "Marble" || floorType === "Tiles";

  if (reflective) {
    return (
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <MeshReflectorMaterial
          color={material.color}
          roughness={floorType === "Marble" ? 0.16 : 0.26}
          metalness={floorType === "Marble" ? 0.06 : 0.04}
          envMapIntensity={floorType === "Marble" ? 0.78 : 0.42}
          resolution={256}
          blur={[400, 120]}
          mixBlur={8}
          mixStrength={floorType === "Marble" ? 0.72 : 0.48}
          depthScale={0.6}
          minDepthThreshold={0.9}
          maxDepthThreshold={1.0}
          mirror={0}
        />
      </mesh>
    );
  }

  return (
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <primitive attach="material" object={material} />
    </mesh>
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
      <AdaptiveWallVisibility
        materials={wallMaterials}
        walls={walls}
        width={width}
        depth={depth}
        wallThickness={wallThickness}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[Math.max(220, width * 3), Math.max(220, depth * 3)]} />
        <meshStandardMaterial color={isOutdoor ? "#6f7e63" : "#dfddd5"} roughness={1} metalness={0} />
      </mesh>

      <FloorMesh
        width={width}
        depth={depth}
        material={materials.floor}
        floorType={settings?.floorMaterial ?? "Wood"}
      />

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
      {!isOutdoor ? <WindowLighting width={width} depth={depth} height={height} architecture={resolvedArchitecture} /> : null}
      <StageBackdrop width={width} depth={depth} height={height} architecture={resolvedArchitecture} />
    </group>
  );
}
