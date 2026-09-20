import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Sparkles, Torus } from '@react-three/drei';
import * as THREE from 'three';

export default function CommunicationCore() {
  const coreRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.15;
      coreRef.current.position.y = Math.sin(t * 0.5) * 0.2;
    }
    
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.3;
      ring1Ref.current.rotation.y = t * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = -t * 0.2;
      ring2Ref.current.rotation.z = t * 0.25;
    }
  });

  return (
    <group ref={coreRef}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        {/* Inner Energy Core */}
        <Sphere args={[1.2, 64, 64]} scale={1}>
          <MeshDistortMaterial 
            color="#4c1d95" // Deep purple
            emissive="#7c3aed"
            emissiveIntensity={2}
            distort={0.4} 
            speed={2} 
            roughness={0.2}
            metalness={0.8}
            wireframe={false}
          />
        </Sphere>
        
        {/* Outer Wireframe Shell */}
        <Sphere args={[1.4, 32, 32]}>
          <meshStandardMaterial 
            color="#a78bfa" 
            wireframe 
            transparent 
            opacity={0.15}
            emissive="#c4b5fd"
            emissiveIntensity={0.5}
          />
        </Sphere>

        {/* Orbital Rings */}
        <Torus ref={ring1Ref} args={[2.2, 0.02, 16, 100]} rotation={[Math.PI / 3, 0, 0]}>
          <meshStandardMaterial color="#8b5cf6" emissive="#a78bfa" emissiveIntensity={2} />
        </Torus>
        <Torus ref={ring2Ref} args={[2.8, 0.015, 16, 100]} rotation={[-Math.PI / 4, Math.PI / 4, 0]}>
          <meshStandardMaterial color="#06b6d4" emissive="#22d3ee" emissiveIntensity={1.5} />
        </Torus>

        {/* Surrounding Data Particles */}
        <Sparkles 
          count={200} 
          scale={8} 
          size={4} 
          speed={0.4} 
          opacity={0.8} 
          color="#c4b5fd" 
        />
        <Sparkles 
          count={100} 
          scale={12} 
          size={2} 
          speed={0.2} 
          opacity={0.5} 
          color="#67e8f9" 
        />
      </Float>
    </group>
  );
}
