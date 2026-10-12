import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useWebGLSupport } from '../hooks/useWebGLSupport';
import WebGLCanvasFallback from './WebGLCanvasFallback';
import { Users, Radio } from 'lucide-react';

export interface PeerNodeData {
  peerId: string;
  displayName?: string;
  connectionState: 'connected' | 'connecting' | 'disconnected' | 'failed' | string;
  isSpeaking?: boolean;
  rtt?: number | null;
  candidateType?: string;
  connectionPath?: string;
  selectedPairConfirmed?: boolean;
  hasAudio?: boolean;
  hasVideo?: boolean;
}

export interface LocalUserData {
  id?: string;
  displayName?: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isVideoActive?: boolean;
}

export interface RoomNode {
  id: string;
  name: string;
  type: string;
  code: string;
}

export interface NetworkTopology3DProps {
  localUser?: LocalUserData;
  peers?: PeerNodeData[];
  rooms?: RoomNode[];
  onSelectPeer?: (peerId: string) => void;
  onSelectRoom?: (code: string) => void;
  className?: string;
}

export default function NetworkTopology3D({
  localUser = { displayName: 'You (Local)' },
  peers = [],
  rooms = [],
  onSelectPeer,
  onSelectRoom,
  className = '',
}: NetworkTopology3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const { canRender3D } = useWebGLSupport();
  const [renderError, setRenderError] = useState(false);
  const [hoveredPeer, setHoveredPeer] = useState<PeerNodeData | null>(null);

  // Normalize peer list or fallback to rooms if room browsing mode
  const effectivePeers: PeerNodeData[] = useMemo(() => {
    if (peers.length > 0) return peers;
    if (rooms.length > 0) {
      return rooms.map((r) => ({
        peerId: r.code,
        displayName: r.name,
        connectionState: 'connected',
        candidateType: 'Mesh Channel',
        rtt: 18,
        isSpeaking: false,
      }));
    }
    return [];
  }, [peers, rooms]);

  useEffect(() => {
    if (!canRender3D || renderError) return;
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene, Camera & Depth Lighting
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060913, 0.035);

    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 2, 12);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      console.warn('WebGL initialization failed for NetworkTopology3D, falling back to 2D:', e);
      setRenderError(true);
      return;
    }
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    // Human-tuned Atmospheric Lights
    const ambientLight = new THREE.AmbientLight(0x475569, 1.2);
    scene.add(ambientLight);

    const cyanPoint = new THREE.PointLight(0x00f0ff, 3.2, 28);
    cyanPoint.position.set(0, 1, 3);
    scene.add(cyanPoint);

    const violetPoint = new THREE.PointLight(0x8b5cf6, 2.8, 25);
    violetPoint.position.set(-6, 3, 2);
    scene.add(violetPoint);

    const emeraldPoint = new THREE.PointLight(0x10b981, 2.2, 22);
    emeraldPoint.position.set(6, -2, 2);
    scene.add(emeraldPoint);

    // 2. Central Local Node (Local User Sovereign Core)
    const centralGroup = new THREE.Group();

    const coreGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.6,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    centralGroup.add(coreMesh);

    // Acoustic Voice Energy Sphere (pulses on microphone energy)
    const acousticGeo = new THREE.SphereGeometry(1.48, 32, 32);
    const acousticMat = new THREE.MeshStandardMaterial({
      color: localUser.isSpeaking ? 0x10b981 : 0x22d3ee,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: localUser.isSpeaking ? 0.45 : 0.2,
      emissive: localUser.isSpeaking ? 0x059669 : 0x0891b2,
      emissiveIntensity: localUser.isSpeaking ? 0.8 : 0.3,
    });
    const acousticMesh = new THREE.Mesh(acousticGeo, acousticMat);
    centralGroup.add(acousticMesh);

    // Wireframe Cage around Local Node
    const cageGeo = new THREE.IcosahedronGeometry(1.4, 2);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    centralGroup.add(cageMesh);

    scene.add(centralGroup);

    // 3. Orbital Guidance Rings
    const orbitRingGeo1 = new THREE.TorusGeometry(4.8, 0.02, 16, 120);
    const orbitRingMat1 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
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

    // 4. Remote Connected Peer Nodes
    const satelliteMeshes: {
      mesh: THREE.Mesh;
      peer: PeerNodeData;
      angle: number;
      radius: number;
      yOffset: number;
      line: THREE.Line;
      lineGeo: THREE.BufferGeometry;
    }[] = [];

    const packetMeshes: { mesh: THREE.Mesh; targetIdx: number; progress: number; speed: number }[] = [];
    const packetGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const packetMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const peerCount = Math.max(1, effectivePeers.length);

    effectivePeers.forEach((peer, idx) => {
      const angle = (idx / peerCount) * Math.PI * 2;
      const radius = 4.8;
      const isConnected = peer.connectionState === 'connected';
      const isConnecting = peer.connectionState === 'connecting';

      // Shape & Material based on connection and speaking state
      const satGeo = new THREE.DodecahedronGeometry(0.65, 0);
      let satColor = 0x06b6d4; // Cyan (connected)
      let emissiveColor = 0x0e7490;

      if (peer.isSpeaking) {
        satColor = 0x10b981; // Mint / Emerald active speaker
        emissiveColor = 0x059669;
      } else if (isConnecting) {
        satColor = 0xf59e0b; // Amber negotiating
        emissiveColor = 0xb45309;
      } else if (!isConnected) {
        satColor = 0x64748b; // Muted slate disconnected
        emissiveColor = 0x334155;
      }

      const satMat = new THREE.MeshStandardMaterial({
        color: satColor,
        roughness: 0.2,
        metalness: 0.5,
        emissive: emissiveColor,
        emissiveIntensity: peer.isSpeaking ? 0.9 : 0.45,
      });

      const satMesh = new THREE.Mesh(satGeo, satMat);
      satMesh.userData = { peer };
      scene.add(satMesh);

      // Connection Link Line between Central and Peer
      const linePositions = new Float32Array(6); // [0,0,0, px,py,pz]
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

      const lineMat = new THREE.LineBasicMaterial({
        color: isConnected ? 0x22d3ee : isConnecting ? 0xfbbf24 : 0x475569,
        transparent: true,
        opacity: isConnected ? 0.4 : 0.2,
      });
      const lineMesh = new THREE.Line(lineGeo, lineMat);
      scene.add(lineMesh);

      satelliteMeshes.push({
        mesh: satMesh,
        peer,
        angle,
        radius,
        yOffset: Math.sin(idx * 1.5) * 0.7,
        line: lineMesh,
        lineGeo,
      });

      // Initialize traveling data packets for connected peers
      if (isConnected) {
        for (let p = 0; p < 3; p++) {
          const pMesh = new THREE.Mesh(packetGeo, packetMat.clone());
          scene.add(pMesh);
          packetMeshes.push({
            mesh: pMesh,
            targetIdx: idx,
            progress: p * 0.33,
            speed: 0.008 + (p % 2) * 0.004,
          });
        }
      }
    });

    // 5. Star Dust Particles Background
    const starGeo = new THREE.BufferGeometry();
    const starCount = 300;
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
      opacity: 0.4,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 6. Interactive Raycaster for Hover & Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let targetCameraX = 0;
    let targetCameraY = 2;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouse.set(x, y);

      targetCameraX = x * 1.4;
      targetCameraY = 2 + y * 0.7;
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const meshes = satelliteMeshes.map((s) => s.mesh);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const clicked = intersects[0].object;
        const peerData = clicked.userData.peer as PeerNodeData;
        if (peerData) {
          if (onSelectPeer) onSelectPeer(peerData.peerId);
          if (onSelectRoom) onSelectRoom(peerData.peerId);
        }
      }
    };

    mount.addEventListener('mousemove', handleMouseMove);
    mount.addEventListener('click', handleClick);

    // 7. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera parallax
      camera.position.x += (targetCameraX - camera.position.x) * 0.04;
      camera.position.y += (targetCameraY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Core rotations & acoustic breathing
      centralGroup.rotation.y = elapsed * 0.18;
      cageMesh.rotation.x = elapsed * 0.25;
      cageMesh.rotation.z = elapsed * 0.12;

      const acousticPulse = localUser.isSpeaking
        ? 1.08 + Math.sin(elapsed * 9) * 0.08
        : 1 + Math.sin(elapsed * 2) * 0.03;
      acousticMesh.scale.set(acousticPulse, acousticPulse, acousticPulse);

      orbitRing1.rotation.z = elapsed * 0.07;
      orbitRing2.rotation.z = -elapsed * 0.05;

      // Update Satellites along orbital paths & dynamic link lines
      satelliteMeshes.forEach((sat) => {
        const currentAngle = sat.angle + elapsed * 0.2;
        const x = Math.cos(currentAngle) * sat.radius;
        const z = Math.sin(currentAngle) * (sat.radius * 0.75);
        const y = Math.sin(currentAngle * 2) * 0.5 + sat.yOffset;

        sat.mesh.position.set(x, y, z);
        sat.mesh.rotation.x = elapsed * 0.4;
        sat.mesh.rotation.y = elapsed * 0.7;

        // Update connection line geometry vertices [0,0,0] to [x,y,z]
        const posAttr = sat.lineGeo.getAttribute('position') as THREE.BufferAttribute;
        if (posAttr) {
          posAttr.setXYZ(0, 0, 0, 0);
          posAttr.setXYZ(1, x, y, z);
          posAttr.needsUpdate = true;
        }
      });

      // Update traveling data packets
      packetMeshes.forEach((packet) => {
        packet.progress += packet.speed;
        if (packet.progress > 1) packet.progress = 0;

        const targetSat = satelliteMeshes[packet.targetIdx];
        if (targetSat) {
          const endX = targetSat.mesh.position.x;
          const endY = targetSat.mesh.position.y;
          const endZ = targetSat.mesh.position.z;

          packet.mesh.position.set(
            endX * packet.progress,
            endY * packet.progress,
            endZ * packet.progress
          );
        }
      });

      // Raycast for hover state
      raycaster.setFromCamera(mouse, camera);
      const meshes = satelliteMeshes.map((s) => s.mesh);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hovered = intersects[0].object as THREE.Mesh;
        const peerData = hovered.userData.peer as PeerNodeData;
        hovered.scale.set(1.22, 1.22, 1.22);
        document.body.style.cursor = 'pointer';

        if (!hoveredPeer || hoveredPeer.peerId !== peerData.peerId) {
          setHoveredPeer(peerData);
        }
      } else {
        satelliteMeshes.forEach((s) => s.mesh.scale.set(1, 1, 1));
        document.body.style.cursor = 'default';
        if (hoveredPeer) setHoveredPeer(null);
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

      if (renderer && renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      if (renderer) renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      acousticGeo.dispose();
      acousticMat.dispose();
      cageGeo.dispose();
      cageMat.dispose();
      orbitRingGeo1.dispose();
      orbitRingMat1.dispose();
      orbitRingGeo2.dispose();
      orbitRingMat2.dispose();
      packetGeo.dispose();
      packetMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      satelliteMeshes.forEach((s) => {
        s.mesh.geometry.dispose();
        if (Array.isArray(s.mesh.material)) s.mesh.material.forEach((m) => m.dispose());
        else s.mesh.material.dispose();
        s.lineGeo.dispose();
        if (Array.isArray(s.line.material)) s.line.material.forEach((m) => m.dispose());
        else s.line.material.dispose();
      });
    };
  }, [effectivePeers, localUser, onSelectPeer, onSelectRoom, canRender3D, renderError]);

  return (
    <div
      className={`relative w-full h-[320px] rounded-3xl overflow-hidden bg-gradient-to-b from-[#0b1021]/95 via-[#070b16]/95 to-[#030611] border border-cyan-500/25 shadow-[0_15px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl select-none ${className}`}
    >
      {/* 3D Canvas Mount or 2D Fallback */}
      {!canRender3D || renderError ? (
        <WebGLCanvasFallback
          title="Live Peer-to-Peer Mesh Topology"
          description={`${effectivePeers.length} active node${effectivePeers.length === 1 ? '' : 's'} connected via WebRTC.`}
          showBadge
        />
      ) : (
        <div ref={mountRef} className="absolute inset-0 w-full h-full" />
      )}

      {/* Top Left: Local Peer Node Status Badge */}
      <div className="absolute top-4 left-5 flex items-center gap-2.5 pointer-events-none z-10">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-white/10 backdrop-blur-md shadow-md">
          <span
            className={`w-2 h-2 rounded-full ${
              localUser.isSpeaking
                ? 'bg-emerald-400 animate-ping shadow-[0_0_10px_#10b981]'
                : 'bg-cyan-400 animate-pulse'
            }`}
          />
          <span className="text-xs font-semibold text-white tracking-tight">
            {localUser.displayName || 'You (Local Node)'}
          </span>
          <span className="text-[10px] text-cyan-300 font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
            {localUser.isSpeaking ? 'Speaking' : localUser.isMuted ? 'Muted' : 'Mic Active'}
          </span>
        </div>
      </div>

      {/* Top Right: Real Connected Peer Counter */}
      <div className="absolute top-4 right-5 flex items-center gap-2 pointer-events-none z-10">
        <span className="text-xs font-medium text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-md flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            {effectivePeers.length} {effectivePeers.length === 1 ? 'Peer' : 'Peers'} in Mesh
          </span>
        </span>
      </div>

      {/* Hover Card / Interactive Peer Inspector */}
      {hoveredPeer && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl bg-slate-900/95 border border-cyan-400/50 text-xs text-white shadow-[0_10px_35px_rgba(6,182,212,0.45)] pointer-events-none animate-fade-in flex items-center gap-4 backdrop-blur-xl z-20">
          <div className="relative">
            <span
              className={`w-3 h-3 rounded-full block ${
                hoveredPeer.connectionState === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {hoveredPeer.isSpeaking && (
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <strong className="text-cyan-300 font-semibold text-sm">
                {hoveredPeer.displayName || `Peer #${hoveredPeer.peerId.slice(0, 6)}`}
              </strong>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-neutral-300 uppercase">
                {hoveredPeer.connectionState}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-2.5 font-mono flex-wrap">
              <span>RTT: {typeof hoveredPeer.rtt === 'number' && hoveredPeer.rtt > 0 ? `${hoveredPeer.rtt}ms` : 'Measuring...'}</span>
              <span>•</span>
              <span className="text-cyan-300">{hoveredPeer.connectionPath || 'Negotiating'}</span>
              {hoveredPeer.candidateType && hoveredPeer.candidateType !== 'unknown' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-400">
                  Candidate: {hoveredPeer.candidateType}
                </span>
              )}
              {hoveredPeer.isSpeaking && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-pulse" /> Speaking
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Subtitle Guide */}
      {!hoveredPeer && (
        <div className="absolute bottom-3 left-5 right-5 text-[11px] text-slate-400/80 pointer-events-none flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>
              {effectivePeers.length === 0
                ? 'Awaiting peer connections • Share room invite code to join mesh'
                : '3D WebRTC DataChannel Mesh • Real-time RTT telemetry & DTLS-SRTP transport'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-neutral-500">
            <span>Vanilla Three.js</span>
            <span>•</span>
            <span>Interactive Raycast</span>
          </div>
        </div>
      )}
    </div>
  );
}
