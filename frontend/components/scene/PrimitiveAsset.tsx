"use client";

import { memo, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  selected?: boolean;
  hovered?: boolean;
  color?: string;
  material?: {
    roughness: number;
    metalness: number;
  };
  onClick?: (event: { shiftKey: boolean }) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
};

function PrimitiveAssetComponent({
  url,
  position,
  rotation,
  scale,
  selected,
  hovered,
  color,
  material,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: Props) {
  if (url.startsWith("primitive://")) {
    return (
      <PrimitiveShape
        type={url.replace("primitive://", "")}
        position={position}
        rotation={rotation}
        scale={scale}
        selected={selected}
        hovered={hovered}
        color={color}
        material={material}
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      />
    );
  }

  return (
    <GltfAsset
      url={url}
      position={position}
      rotation={rotation}
      scale={scale}
      selected={selected}
      hovered={hovered}
      color={color}
      material={material}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    />
  );
}

function SelectionRing({
  position,
  color = "#49d24d",
}: {
  position: [number, number, number];
  color?: string;
}) {
  return (
    <mesh
      position={[position[0], position[1] + 0.05, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.55, 0.78, 40]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function LocalSelectionRing({ color = "#49d24d" }: { color?: string }) {
  return (
    <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.55, 0.78, 40]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function applySceneMaterial(
  root: THREE.Object3D,
  color?: string,
  materialConfig?: { roughness: number; metalness: number },
) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const sourceMaterial = Array.isArray(mesh.material)
      ? mesh.material[0]
      : mesh.material;

    const nextMaterial =
      sourceMaterial instanceof THREE.MeshStandardMaterial
        ? sourceMaterial.clone()
        : new THREE.MeshStandardMaterial();

    if (color) {
      nextMaterial.color = new THREE.Color(color);
    }

    nextMaterial.roughness = materialConfig?.roughness ?? nextMaterial.roughness;
    nextMaterial.metalness = materialConfig?.metalness ?? nextMaterial.metalness;
    mesh.material = nextMaterial;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

function GltfAsset({
  url,
  position,
  rotation,
  scale,
  selected,
  hovered,
  color,
  material,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: Props) {
  const { scene } = useGLTF(url);

  const normalizedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    box.getCenter(center);

    cloned.position.x -= center.x;
    cloned.position.z -= center.z;
    cloned.position.y -= box.min.y;

    applySceneMaterial(cloned, color, material);

    const wrapper = new THREE.Group();
    wrapper.add(cloned);
    return wrapper;
  }, [scene, color, material]);

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onClick?.({ shiftKey: event.shiftKey });
      }}
      onPointerEnter={(event) => {
        event.stopPropagation();
        onPointerEnter?.();
      }}
      onPointerLeave={(event) => {
        event.stopPropagation();
        onPointerLeave?.();
      }}
    >
      <primitive
        object={normalizedScene}
        position={position}
        rotation={rotation}
        scale={scale}
      />

      {selected ? (
        <SelectionRing position={position} color="#4D96FF" />
      ) : hovered ? (
        <SelectionRing position={position} color="#9CC9FF" />
      ) : null}
    </group>
  );
}

function PrimitiveShape({
  type,
  position,
  rotation,
  scale,
  selected,
  hovered,
  color,
  material,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: Props & { type: string }) {
  const geometry = useMemo(() => {
    if (type === "round_table" || type === "plant") {
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
    }

    return new THREE.BoxGeometry(1, 1, 1);
  }, [type]);

  const meshMaterial = useMemo(() => {
    const colorMap: Record<string, string> = {
      round_table: "#d8c3a5",
      rectangular_table: "#c9ada7",
      stage: "#6d6875",
      dance_floor: "#d4a373",
      aisle: "#e9edc9",
      sofa: "#84a98c",
      bar: "#9c6644",
      plant: "#6a994e",
      entrance: "#52796f",
    };

    return new THREE.MeshStandardMaterial({
      color: color || colorMap[type] || "#adb5bd",
      roughness: material?.roughness ?? 0.72,
      metalness: material?.metalness ?? 0.08,
    });
  }, [color, material, type]);

  const yOffset = scale[1] / 2;

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.({ shiftKey: event.shiftKey });
      }}
      onPointerEnter={(event) => {
        event.stopPropagation();
        onPointerEnter?.();
      }}
      onPointerLeave={(event) => {
        event.stopPropagation();
        onPointerLeave?.();
      }}
    >
      <mesh
        position={[0, yOffset, 0]}
        scale={scale}
        geometry={geometry}
        material={meshMaterial}
        castShadow
        receiveShadow
      />

      {selected ? (
        <LocalSelectionRing color="#4D96FF" />
      ) : hovered ? (
        <LocalSelectionRing color="#9CC9FF" />
      ) : null}
    </group>
  );
}

export const PrimitiveAsset = memo(PrimitiveAssetComponent);
