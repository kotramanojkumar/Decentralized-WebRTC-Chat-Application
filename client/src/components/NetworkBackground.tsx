import React, { useEffect, useRef } from 'react';

const NetworkBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    const particleCount = 100; // Phase 21: Increased for 3D depth
    const focalLength = 300; // 3D projection focal length
    
    // Resize canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const isDark = document.documentElement.classList.contains('dark');
    // Phase 22: Holographic color palette
    const colorPrimary = isDark ? 'rgba(79, 70, 229, ' : 'rgba(99, 102, 241, '; // Indigo
    const colorSecondary = isDark ? 'rgba(139, 92, 246, ' : 'rgba(168, 85, 247, '; // Violet
    const colorTertiary = isDark ? 'rgba(14, 165, 233, ' : 'rgba(56, 189, 248, '; // Sky Blue

    class Particle {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      baseSize: number;
      color: string;

      constructor() {
        this.x = (Math.random() - 0.5) * canvas!.width * 2;
        this.y = (Math.random() - 0.5) * canvas!.height * 2;
        this.z = Math.random() * focalLength * 2;
        
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.vz = (Math.random() - 0.5) * 2;
        
        this.baseSize = Math.random() * 2 + 1;
        
        const rand = Math.random();
        this.color = rand > 0.66 ? colorPrimary : (rand > 0.33 ? colorSecondary : colorTertiary);
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        // Bounce bounds
        if (this.x < -canvas!.width || this.x > canvas!.width) this.vx *= -1;
        if (this.y < -canvas!.height || this.y > canvas!.height) this.vy *= -1;
        if (this.z < 0 || this.z > focalLength * 3) this.vz *= -1;
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Sort by Z for proper rendering order (back to front)
      particles.sort((a, b) => b.z - a.z);

      // Store projected 2D coordinates for line drawing
      const projected: {x: number, y: number, scale: number, p: Particle}[] = [];

      particles.forEach(p => {
        p.update();
        if (p.z > 0) {
          const scale = focalLength / (focalLength + p.z);
          const px = centerX + p.x * scale;
          const py = centerY + p.y * scale;
          
          projected.push({ x: px, y: py, scale, p });

          ctx.beginPath();
          ctx.arc(px, py, p.baseSize * scale * 2, 0, Math.PI * 2);
          const alpha = Math.min(1, Math.max(0, scale * 1.5));
          ctx.fillStyle = p.color + alpha + ')';
          ctx.fill();
          
          // Phase 22: Holographic Glow on nodes
          ctx.shadowBlur = 10 * scale;
          ctx.shadowColor = p.color + '1)';
        }
      });

      ctx.shadowBlur = 0; // Reset shadow for lines

      // Draw 3D-aware connections
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const distance2D = Math.sqrt(dx * dx + dy * dy);
          const dz = Math.abs(projected[i].p.z - projected[j].p.z);

          // Only connect if close in both 2D projection AND true 3D depth
          if (distance2D < 100 * projected[i].scale && dz < 150) {
            ctx.beginPath();
            const opacity = (1 - distance2D / (100 * projected[i].scale)) * (1 - dz / 150) * projected[i].scale;
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.5})`; // Holographic purple line
            ctx.lineWidth = 1 * projected[i].scale;
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-70"
      style={{ mixBlendMode: 'screen', filter: 'contrast(1.2)' }}
    />
  );
};

export default NetworkBackground;
