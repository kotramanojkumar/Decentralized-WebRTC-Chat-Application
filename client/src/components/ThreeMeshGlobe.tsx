import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useWebGLSupport } from '../hooks/useWebGLSupport';
import WebGLCanvasFallback from './WebGLCanvasFallback';

export default function ThreeMeshGlobe() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { canRender3D } = useWebGLSupport();
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    if (!canRender3D || renderError) return;
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.0018);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 18;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      console.warn('WebGL initialization failed, falling back to 2D:', e);
      setRenderError(true);
      return;
    }
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // 2. Main 3D Decentralized Core Globe (Icosahedron Mesh)
    const coreGeometry = new THREE.IcosahedronGeometry(5.2, 3);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // Inner Glowing Core
    const innerGeo = new THREE.IcosahedronGeometry(4.2, 2);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerMesh);

    // 3. Decentralized Peer Nodes (Floating glowing spheres at vertices)
    const nodeCount = 36;
    const nodeGroup = new THREE.Group();
    const nodeGeometry = new THREE.SphereGeometry(0.18, 16, 16);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const nodes: THREE.Mesh[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      const radius = 5.3 + (i % 3) * 0.4;

      node.position.set(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi)
      );
      nodeGroup.add(node);
      nodes.push(node);
    }
    scene.add(nodeGroup);

    // 4. Orbital Ring with Data Packets
    const ringGeo = new THREE.TorusGeometry(7.5, 0.04, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.4,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    ringMesh.rotation.y = Math.PI / 6;
    scene.add(ringMesh);

    const ringGeo2 = new THREE.TorusGeometry(8.2, 0.03, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.3,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -Math.PI / 4;
    ringMesh2.rotation.y = Math.PI / 3;
    scene.add(ringMesh2);

    // 5. Starfield / Ambient Particle Cloud
    const particleCount = 700;
    const particleGeo = new THREE.BufferGeometry();
    const particleCoords = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particleCoords[i] = (Math.random() - 0.5) * 45;
      particleCoords[i + 1] = (Math.random() - 0.5) * 45;
      particleCoords[i + 2] = (Math.random() - 0.5) * 45;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particleCoords, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.6,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 6. Interactive Mouse Movement Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (event: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      mouseX = (x / rect.width) * 2;
      mouseY = -(y / rect.height) * 2;
    };

    window.addEventListener('mousemove', onMouseMove);

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;
      camera.position.x = targetX * 3.5;
      camera.position.y = targetY * 2.5;
      camera.lookAt(scene.position);

      // Rotations
      coreMesh.rotation.y = elapsedTime * 0.12;
      coreMesh.rotation.x = elapsedTime * 0.06;

      innerMesh.rotation.y = -elapsedTime * 0.15;
      innerMesh.rotation.z = elapsedTime * 0.08;

      nodeGroup.rotation.y = elapsedTime * 0.12;
      nodeGroup.rotation.x = elapsedTime * 0.06;

      ringMesh.rotation.z = elapsedTime * 0.2;
      ringMesh2.rotation.z = -elapsedTime * 0.18;

      particleSystem.rotation.y = elapsedTime * 0.02;

      // Pulse node scales
      nodes.forEach((n, idx) => {
        const offsetScale = 1 + Math.sin(elapsedTime * 3 + idx) * 0.2;
        n.scale.set(offsetScale, offsetScale, offsetScale);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [canRender3D, renderError]);

  if (!canRender3D || renderError) {
    return (
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-60">
        <WebGLCanvasFallback
          title="Decentralized Peer-to-Peer Lattice"
          description="High-performance 2D canvas mode active."
        />
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
      style={{ opacity: 0.95 }}
    />
  );
}
