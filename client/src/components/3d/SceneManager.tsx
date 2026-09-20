import { Canvas } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import CommunicationCore from './CommunicationCore';
import CameraController from './CameraController';
import NetworkTopology from './NetworkTopology';

export default function SceneManager() {
  return (
    <div className="fixed inset-0 w-full h-full z-[-1] bg-[#050508] ">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 45 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        {/* Lights */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#8b5cf6" />
        <pointLight position={[-10, -10, -5]} intensity={1} color="#06b6d4" />
        
        {/* Environment & Background */}
        <Environment preset="night" />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        {/* Scene Objects */}
        <CommunicationCore />
        <CameraController />
        <NetworkTopology />
        
        {/* Cinematic Post-Processing */}
        <EffectComposer >
          <Bloom 
            luminanceThreshold={0.2} 
            luminanceSmoothing={0.9} 
            intensity={1.5} 
            mipmapBlur 
          />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}


