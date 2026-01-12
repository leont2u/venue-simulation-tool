import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ControlPanel from "./ControlPanel";
import type { VenueObject, ObjectType } from "../types/project.types";
import {
  generateId,
  saveSceneToLocalStorage,
  loadSceneFromLocalStorage,
  downloadSceneAsJSON,
} from "../utils/localstorage";

export default function VenueEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  const [venueObjects, setVenueObjects] = useState<VenueObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<
    "select" | "move" | "rotate" | "scale"
  >("select");
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(15, 15, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const floorGeometry = new THREE.PlaneGeometry(40, 40);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d2d44,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(40, 40, 0x666666, 0x444444);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    const wallHeight = 8;
    const wallThickness = 0.5;
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d3d5c,
      roughness: 0.9,
    });

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(40, wallHeight, wallThickness),
      wallMaterial
    );
    backWall.position.set(0, wallHeight / 2, -20);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, 40),
      wallMaterial
    );
    leftWall.position.set(-20, wallHeight / 2, 0);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, 40),
      wallMaterial
    );
    rightWall.position.set(20, wallHeight / 2, 0);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    scene.add(rightWall);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const createMeshForObject = (obj: VenueObject): THREE.Mesh | null => {
    let geometry: THREE.BufferGeometry;
    let material: THREE.MeshStandardMaterial;

    switch (obj.type) {
      case "chair":
        geometry = new THREE.BoxGeometry(0.8, 1.2, 0.8);
        material = new THREE.MeshStandardMaterial({
          color: 0x8b4513,
          roughness: 0.7,
        });
        break;
      case "table":
        geometry = new THREE.BoxGeometry(2, 0.8, 1.2);
        material = new THREE.MeshStandardMaterial({
          color: 0x654321,
          roughness: 0.6,
        });
        break;
      case "stage":
        geometry = new THREE.BoxGeometry(6, 1, 4);
        material = new THREE.MeshStandardMaterial({
          color: 0x2c2c2c,
          roughness: 0.8,
        });
        break;
      default:
        return null;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
    mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
    mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  };

  useEffect(() => {
    if (!sceneRef.current) return;

    objectsMapRef.current.forEach((mesh) => {
      sceneRef.current?.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    objectsMapRef.current.clear();

    venueObjects.forEach((obj) => {
      const mesh = createMeshForObject(obj);
      if (mesh) {
        mesh.userData.id = obj.id;
        mesh.userData.type = obj.type;
        sceneRef.current?.add(mesh);
        objectsMapRef.current.set(obj.id, mesh);
      }
    });
  }, [venueObjects]);

  useEffect(() => {
    objectsMapRef.current.forEach((mesh, id) => {
      const isSelected = id === selectedObjectId;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(isSelected ? 0x444444 : 0x000000);
    });
  }, [selectedObjectId]);

  const handleAddObject = (type: ObjectType) => {
    const newObject: VenueObject = {
      id: generateId(),
      type,
      position: {
        x: 0,
        y: type === "stage" ? 0.5 : type === "table" ? 0.4 : 0.6,
        z: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };
    setVenueObjects((prev) => [...prev, newObject]);
  };

  const handleClick = (event: React.MouseEvent) => {
    if (isDragging || !cameraRef.current || !sceneRef.current) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    const meshes = Array.from(objectsMapRef.current.values());
    const intersects = raycasterRef.current.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      setSelectedObjectId(clickedMesh.userData.id);
    } else {
      setSelectedObjectId(null);
    }
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button === 0 && selectedObjectId && currentMode !== "select") {
      setIsDragging(true);
      dragStartRef.current = { x: event.clientX, y: event.clientY };
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !selectedObjectId || !dragStartRef.current) return;

    const deltaX = (event.clientX - dragStartRef.current.x) * 0.05;
    const deltaY = (event.clientY - dragStartRef.current.y) * 0.05;

    setVenueObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== selectedObjectId) return obj;

        const updated = { ...obj };

        switch (currentMode) {
          case "move":
            updated.position = {
              ...obj.position,
              x: obj.position.x + deltaX,
              z: obj.position.z + deltaY,
            };
            break;
          case "rotate":
            updated.rotation = {
              ...obj.rotation,
              y: obj.rotation.y + deltaX * 0.1,
            };
            break;
          case "scale":
            const scaleFactor = 1 + deltaX * 0.01;
            updated.scale = {
              x: Math.max(0.1, obj.scale.x * scaleFactor),
              y: Math.max(0.1, obj.scale.y * scaleFactor),
              z: Math.max(0.1, obj.scale.z * scaleFactor),
            };
            break;
        }

        return updated;
      })
    );

    dragStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }
  };

  const handleDelete = () => {
    if (!selectedObjectId) return;
    setVenueObjects((prev) =>
      prev.filter((obj) => obj.id !== selectedObjectId)
    );
    setSelectedObjectId(null);
  };

  const handleSave = () => {
    saveSceneToLocalStorage(venueObjects);
    alert("Scene saved successfully!");
  };

  const handleLoad = () => {
    const loaded = loadSceneFromLocalStorage();
    if (loaded) {
      setVenueObjects(loaded);
      setSelectedObjectId(null);
      alert("Scene loaded successfully!");
    } else {
      alert("No saved scene found!");
    }
  };

  const handleDownload = () => {
    downloadSceneAsJSON(venueObjects);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-amber-950 ">
      <div
        ref={containerRef}
        className="w-full h-full cursor-pointer"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <ControlPanel
        onAddObject={handleAddObject}
        onSetMode={setCurrentMode}
        onDelete={handleDelete}
        onSave={handleSave}
        onLoad={handleLoad}
        onDownload={handleDownload}
        selectedObjectId={selectedObjectId}
        currentMode={currentMode}
      />
    </div>
  );
}
