import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Line, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export default function NetworkTopology() {
  const groupRef = useRef<THREE.Group>(null);
  
  const nodes = useMemo(() => {
    const pts = [];
    for(let i=0; i<12; i++) {
      pts.push(new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10 + 2,
        (Math.random() - 0.5) * 15 - 5
      ));
    }
    return pts;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.05) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, indexA) => (
        nodes.map((target, indexB) => {
          if (indexA !== indexB && node.distanceTo(target) < 8) {
            return (
              <Line 
                key={'line-' + indexA + '-' + indexB} 
                points={[node, target]} 
                color="#8b5cf6" 
                opacity={0.15} 
                transparent 
                lineWidth={1}
              />
            );
          }
          return null;
        })
      ))}
      
      {nodes.map((node, index) => (
        <group key={'node-' + index} position={node}>
          <Sphere args={[0.15, 16, 16]}>
            <meshStandardMaterial 
              color="#06b6d4" 
              emissive="#22d3ee" 
              emissiveIntensity={2} 
            />
          </Sphere>
          <Sparkles count={5} scale={1} size={1} speed={0.4} color="#a78bfa" />
        </group>
      ))}

      <Sparkles count={50} scale={25} size={2} speed={1.5} opacity={0.8} color="#f0fdfa" />
    </group>
  );
}
