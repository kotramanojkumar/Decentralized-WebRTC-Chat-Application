import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface RoomNode {
  id: string;
  name: string;
  type: string;
  code: string;
}

interface NetworkTopology3DProps {
  rooms?: RoomNode[];
  onSelectRoom?: (code: string) => void;
}

export default function NetworkTopology3D({ rooms = [], onSelectRoom }: NetworkTopology3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<{ name: string; type: string; code: string } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene, Camera & Lights Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060913, 0.035);

    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 2.5, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    // Warm Ambient & Atmospheric Lights for human-crafted depth
    const ambientLight = new THREE.AmbientLight(0x475569, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x22d3ee, 3, 25);
    pointLight.position.set(0, 0, 2);
    scene.add(pointLight);

    const violetLight = new THREE.PointLight(0x8b5cf6, 2.5, 25);
    violetLight.position.set(-6, 3, 2);
    scene.add(violetLight);

    const emeraldLight = new THREE.PointLight(0x10b981, 2, 20);
    emeraldLight.position.set(6, -2, 2);
    scene.add(emeraldLight);

    // 2. Central Local Node (Smooth Glowing P2P Core)
    const centralGroup = new THREE.Group();

    // Inner Core Sphere with high quality material
    const coreGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Deep cyan/azure
      roughness: 0.2,
      metalness: 0.6,
      emissive: 0x0369a1,
      emissiveIntensity: 0.5,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    centralGroup.add(coreMesh);

    // Outer Translucent Shield Atmosphere
    const atmosphereGeo = new THREE.SphereGeometry(1.45, 32, 32);
    const atmosphereMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.25,
      wireframe: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    centralGroup.add(atmosphereMesh);

    // Subtle Wireframe Ring around Core
    const coreWireGeo = new THREE.IcosahedronGeometry(1.35, 2);
    const coreWireMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const coreWireMesh = new THREE.Mesh(coreWireGeo, coreWireMat);
    centralGroup.add(coreWireMesh);

    scene.add(centralGroup);

    // 3. Delicate Orbital Rings
    const orbitRingGeo1 = new THREE.TorusGeometry(4.8, 0.02, 16, 120);
    const orbitRingMat1 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.3,
    });
    const orbitRing1 = new THREE.Mesh(orbitRingGeo1, orbitRingMat1);
    orbitRing1.rotation.x = Math.PI / 2.3;
    orbitRing1.rotation.y = 0.15;
    scene.add(orbitRing1);

    const orbitRingGeo2 = new THREE.TorusGeometry(5.2, 0.015, 16, 120);
    const orbitRingMat2 = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.2,
    });
    const orbitRing2 = new THREE.Mesh(orbitRingGeo2, orbitRingMat2);
    orbitRing2.rotation.x = Math.PI / 2.5;
    orbitRing2.rotation.y = -0.25;
    scene.add(orbitRing2);

    // 4. Satellite Nodes (Representing Peer Rooms)
    const effectiveRooms = rooms.length > 0 ? rooms : [
      { id: '1', name: 'Direct P2P Bridge', type: 'p2p', code: 'direct-p2p' },
      { id: '2', name: 'Mesh Conference', type: 'group', code: 'mesh-conf' },
      { id: '3', name: 'Encrypted Vault', type: 'vault', code: 'vault-room' },
    ];

    const satelliteMeshes: { mesh: THREE.Mesh; room: RoomNode; baseScale: number; angle: number; radius: number; speed: number; yOffset: number }[] = [];
    const linesGroup = new THREE.Group();
    scene.add(linesGroup);

    // Particles traveling along connection streams
    const packetGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const packetMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const packetMeshes: { mesh: THREE.Mesh; targetIdx: number; progress: number; speed: number }[] = [];

    effectiveRooms.forEach((room, idx) => {
      const angle = (idx / effectiveRooms.length) * Math.PI * 2;
      const radius = 4.8;
      const speed = 0.25 + idx * 0.05;

      let satGeo: THREE.BufferGeometry;
      let satMat: THREE.Material;

      if (room.type === 'p2p') {
        satGeo = new THREE.IcosahedronGeometry(0.65, 1);
        satMat = new THREE.MeshStandardMaterial({
          color: 0x8b5cf6, // Electric violet
          roughness: 0.2,
          metalness: 0.5,
          emissive: 0x5b21b6,
          emissiveIntensity: 0.4,
        });
      } else if (room.type === 'group') {
        satGeo = new THREE.DodecahedronGeometry(0.7, 0);
        satMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4, // Holographic cyan
          roughness: 0.2,
          metalness: 0.5,
          emissive: 0x0e7490,
          emissiveIntensity: 0.4,
        });
      } else {
        satGeo = new THREE.OctahedronGeometry(0.65, 0);
        satMat = new THREE.MeshStandardMaterial({
          color: 0x10b981, // Neon mint
          roughness: 0.2,
          metalness: 0.5,
          emissive: 0x047857,
          emissiveIntensity: 0.4,
        });
      }

      const satMesh = new THREE.Mesh(satGeo, satMat);
      satMesh.userData = { room };
      scene.add(satMesh);

      satelliteMeshes.push({
        mesh: satMesh,
        room,
        baseScale: 1,
        angle,
        radius,
        speed,
        yOffset: Math.sin(idx * 1.5) * 0.8,
      });

      // Initialize traveling data packets
      for (let p = 0; p < 4; p++) {
        const pMesh = new THREE.Mesh(packetGeo, packetMat.clone());
        scene.add(pMesh);
        packetMeshes.push({
          mesh: pMesh,
          targetIdx: idx,
          progress: p * 0.25,
          speed: 0.008 + (p % 2) * 0.003,
        });
      }
    });

    // 5. Star Dust Particles Background
    const starGeo = new THREE.BufferGeometry();
    const starCount = 350;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 35;
      starPos[i + 1] = (Math.random() - 0.5) * 20;
      starPos[i + 2] = (Math.random() - 0.5) * 25 - 5;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.06,
      transparent: true,
      opacity: 0.5,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 6. Interactive Raycaster for Mouse Hover & Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let targetCameraX = 0;
    let targetCameraY = 2.5;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouse.set(x, y);

      targetCameraX = x * 1.5;
      targetCameraY = 2.5 + y * 0.8;
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const meshes = satelliteMeshes.map((s) => s.mesh);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const clicked = intersects[0].object;
        const roomData = clicked.userData.room as RoomNode;
        if (roomData && onSelectRoom) {
          onSelectRoom(roomData.code);
        }
      }
    };

    mount.addEventListener('mousemove', handleMouseMove);
    mount.addEventListener('click', handleClick);

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera parallax
      camera.position.x += (targetCameraX - camera.position.x) * 0.04;
      camera.position.y += (targetCameraY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Core gentle pulsing & rotation
      centralGroup.rotation.y = elapsed * 0.2;
      coreWireMesh.rotation.x = elapsed * 0.3;
      coreWireMesh.rotation.z = elapsed * 0.15;
      const pulse = Math.sin(elapsed * 2) * 0.04 + 1;
      atmosphereMesh.scale.set(pulse, pulse, pulse);

      orbitRing1.rotation.z = elapsed * 0.08;
      orbitRing2.rotation.z = -elapsed * 0.05;

      // Update Satellites along orbital paths
      satelliteMeshes.forEach((sat) => {
        const currentAngle = sat.angle + elapsed * 0.22;
        const x = Math.cos(currentAngle) * sat.radius;
        const z = Math.sin(currentAngle) * (sat.radius * 0.7);
        const y = Math.sin(currentAngle * 2) * 0.6 + sat.yOffset;

        sat.mesh.position.set(x, y, z);
        sat.mesh.rotation.x = elapsed * 0.5;
        sat.mesh.rotation.y = elapsed * 0.8;
      });

      // Update traveling data packets
      packetMeshes.forEach((packet) => {
        packet.progress += packet.speed;
        if (packet.progress > 1) packet.progress = 0;

        const targetSat = satelliteMeshes[packet.targetIdx];
        if (targetSat) {
          const startX = 0, startY = 0, startZ = 0;
          const endX = targetSat.mesh.position.x;
          const endY = targetSat.mesh.position.y;
          const endZ = targetSat.mesh.position.z;

          packet.mesh.position.set(
            startX + (endX - startX) * packet.progress,
            startY + (endY - startY) * packet.progress,
            startZ + (endZ - startZ) * packet.progress
          );
        }
      });

      // Raycasting for hover state
      raycaster.setFromCamera(mouse, camera);
      const meshes = satelliteMeshes.map((s) => s.mesh);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hovered = intersects[0].object as THREE.Mesh;
        const roomData = hovered.userData.room as RoomNode;
        hovered.scale.set(1.25, 1.25, 1.25);
        document.body.style.cursor = 'pointer';

        if (!hoveredNode || hoveredNode.code !== roomData.code) {
          setHoveredNode({ name: roomData.name, type: roomData.type, code: roomData.code });
        }
      } else {
        satelliteMeshes.forEach((s) => s.mesh.scale.set(1, 1, 1));
        document.body.style.cursor = 'default';
        if (hoveredNode) setHoveredNode(null);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      mount.removeEventListener('mousemove', handleMouseMove);
      mount.removeEventListener('click', handleClick);
      document.body.style.cursor = 'default';

      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [rooms, onSelectRoom]);

  return (
    <div className="relative w-full h-[320px] rounded-3xl overflow-hidden bg-gradient-to-b from-[#0b1021]/90 via-[#070b16]/95 to-[#030611] border border-cyan-500/20 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Modern, Human-Made Status Badges */}
      <div className="absolute top-4 left-5 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-emerald-500/30 backdrop-blur-md shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
          <span className="text-xs font-semibold text-slate-200">
            Sovereign Peer Core
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">100% E2EE</span>
        </div>
      </div>

      <div className="absolute top-4 right-5 flex items-center gap-2 pointer-events-none">
        <span className="text-xs font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          <span>{rooms.length > 0 ? rooms.length : 3} Active Orbiting Channels</span>
        </span>
      </div>

      {/* Hover Card / Action Pill */}
      {hoveredNode && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-5 py-2 rounded-2xl bg-slate-900/95 border border-cyan-400/50 text-xs text-white shadow-[0_10px_30px_rgba(6,182,212,0.4)] pointer-events-none animate-fade-in flex items-center gap-3 backdrop-blur-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <div>
            <span className="text-slate-400 mr-1.5">Channel:</span>
            <strong className="text-cyan-300 font-semibold">{hoveredNode.name}</strong>
            <span className="text-[10px] text-emerald-400 ml-2 font-mono">⚡ &lt; 20ms P2P</span>
          </div>
          <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-md text-[10px] font-mono">
            Click to Join
          </span>
        </div>
      )}

      {/* Bottom Subtitle Guide */}
      {!hoveredNode && (
        <div className="absolute bottom-3 left-5 text-[11px] text-slate-400/80 pointer-events-none flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400"></span>
          <span>Interactive P2P Mesh Topology • Hover over nodes to inspect or click to connect</span>
        </div>
      )}
    </div>
  );
}
