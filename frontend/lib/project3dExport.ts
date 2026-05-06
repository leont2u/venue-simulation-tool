"use client";

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { Project, SceneItem } from "@/types/types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(name: string) {
  return `${name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "venue"}-3d.glb`;
}

function material(color: string, roughness = 0.72, metalness = 0.08) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function itemGeometry(item: SceneItem) {
  if (item.type === "round_table" || item.type === "banquet_table" || item.type === "plant") {
    return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
  }
  if (item.type === "column" || item.type === "ceiling_light" || item.type === "pendant_fan") {
    return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
  }

  if (item.type === "chair") return new THREE.BoxGeometry(0.55, 0.82, 0.55);
  if (item.type === "church_bench") return new THREE.BoxGeometry(2.3, 0.82, 0.62);
  if (item.type === "screen" || item.type === "tv") return new THREE.BoxGeometry(3.1, 1.78, 0.14);
  if (item.type === "camera") return new THREE.BoxGeometry(0.48, 1.25, 0.48);
  if (item.type === "speaker") return new THREE.BoxGeometry(0.7, 1.2, 0.7);
  if (item.type === "stage") return new THREE.BoxGeometry(1, 0.35, 1);
  if (item.type === "dance_floor") return new THREE.BoxGeometry(1, 0.04, 1);

  return new THREE.BoxGeometry(1, 1, 1);
}

function itemColor(item: SceneItem) {
  const colors: Record<string, string> = {
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
    round_table: "#d8c3a5",
    rectangular_table: "#c9ada7",
    dance_floor: "#d4a373",
    column: "#777d7d",
    ceiling_light: "#fff7d7",
    ceiling_cove: "#9ec7ff",
    pendant_fan: "#8b5e35",
    railing: "#6f7775",
    sofa: "#8f9ea1",
    speaker: "#30343b",
    mixing_desk: "#343a55",
    stage: "#6d6875",
  };

  return item.color || colors[item.type] || "#9aa6a0";
}

function buildExportScene(project: Project) {
  const scene = new THREE.Scene();
  scene.name = project.name;

  const settings = project.sceneSettings;
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(project.room.width, 0.08, project.room.depth),
    material(settings?.floorColor ?? "#F4F1EA", 0.86, 0.02),
  );
  floor.name = "Floor";
  floor.position.y = -0.04;
  scene.add(floor);

  const wallThickness = project.room.wallThickness ?? settings?.wallThickness ?? 0.15;
  const wallMat = material(settings?.wallColor ?? "#F6F2EC", 0.78, 0.02);
  const walls: Array<{
    name: string;
    geometry: THREE.BoxGeometry;
    position: [number, number, number];
  }> = [
    {
      name: "North wall",
      geometry: new THREE.BoxGeometry(project.room.width, project.room.height, wallThickness),
      position: [0, project.room.height / 2, -project.room.depth / 2] as const,
    },
    {
      name: "South wall",
      geometry: new THREE.BoxGeometry(project.room.width, project.room.height, wallThickness),
      position: [0, project.room.height / 2, project.room.depth / 2] as const,
    },
    {
      name: "East wall",
      geometry: new THREE.BoxGeometry(wallThickness, project.room.height, project.room.depth),
      position: [project.room.width / 2, project.room.height / 2, 0] as const,
    },
    {
      name: "West wall",
      geometry: new THREE.BoxGeometry(wallThickness, project.room.height, project.room.depth),
      position: [-project.room.width / 2, project.room.height / 2, 0] as const,
    },
  ];

  for (const wall of walls) {
    const mesh = new THREE.Mesh(wall.geometry, wallMat.clone());
    mesh.name = wall.name;
    mesh.position.set(...wall.position);
    scene.add(mesh);
  }

  for (const item of project.items) {
    const mesh = new THREE.Mesh(
      itemGeometry(item),
      material(itemColor(item), item.material?.roughness, item.material?.metalness),
    );
    mesh.name = item.label || item.type;
    mesh.position.set(item.x, item.y + item.scale[1] / 2, item.z);
    mesh.rotation.y = item.rotationY;
    mesh.scale.set(...item.scale);
    scene.add(mesh);
  }

  scene.add(new THREE.HemisphereLight("#f7efe4", "#6b6259", 0.75));
  const light = new THREE.DirectionalLight("#ffe5bf", 1.25);
  light.position.set(project.room.width * 0.32, project.room.height + 10, project.room.depth * 0.28);
  scene.add(light);

  return scene;
}

export async function exportProjectAsGlb(project: Project) {
  const exporter = new GLTFExporter();
  const scene = buildExportScene(project);

  const result = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      scene,
      (data) => {
        if (data instanceof ArrayBuffer) {
          resolve(data);
          return;
        }

        reject(new Error("3D export did not produce a GLB file."));
      },
      (error) => reject(error),
      { binary: true },
    );
  });

  downloadBlob(new Blob([result], { type: "model/gltf-binary" }), safeFilename(project.name));
}
