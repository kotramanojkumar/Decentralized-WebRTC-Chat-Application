import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useLocation } from 'react-router-dom';
import * as THREE from 'three';

// Map specific routes to camera positions and lookAt targets
const CAMERA_POSITIONS: Record<string, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  '/': { pos: new THREE.Vector3(0, 0, 15), target: new THREE.Vector3(0, 0, 0) },
  '/login': { pos: new THREE.Vector3(5, 2, 8), target: new THREE.Vector3(0, 0, 0) },
  '/register': { pos: new THREE.Vector3(-5, 2, 8), target: new THREE.Vector3(0, 0, 0) },
  '/dashboard': { pos: new THREE.Vector3(0, 3, 6), target: new THREE.Vector3(0, 0, 0) },
  '/room': { pos: new THREE.Vector3(0, 0, 4), target: new THREE.Vector3(0, 0, -5) },
  '/research': { pos: new THREE.Vector3(-6, 4, 6), target: new THREE.Vector3(0, -2, 0) },
  'default': { pos: new THREE.Vector3(0, 2, 10), target: new THREE.Vector3(0, 0, 0) }
};

export default function CameraController() {
  const { camera } = useThree();
  const location = useLocation();
  
  // Target position and lookAt vectors that the camera will smoothly lerp towards
  const targetPos = useRef(new THREE.Vector3(0, 0, 15));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));
  const currentLook = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    // Determine the base path (e.g., /room/123 -> /room)
    const basePath = location.pathname.split('/').slice(0, 2).join('/');
    const config = CAMERA_POSITIONS[basePath] || CAMERA_POSITIONS[location.pathname] || CAMERA_POSITIONS['default'];
    
    targetPos.current.copy(config.pos);
    targetLook.current.copy(config.target);
  }, [location.pathname]);

  useFrame((_, delta) => {
    // Smoothly interpolate position (cinematic damping)
    camera.position.lerp(targetPos.current, 2.5 * delta);
    
    // Smoothly interpolate the look-at target
    currentLook.current.lerp(targetLook.current, 2.5 * delta);
    camera.lookAt(currentLook.current);
  });

  return null;
}
