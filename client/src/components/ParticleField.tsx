import { useEffect, useRef } from 'react';

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  baseSize: number;
  hue: number;
  alpha: number;
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let particles: Particle3D[] = [];
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 45 : 85;
    const fov = 350;
    const depthRange = 600;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };

    const init = () => {
      resize();
      particles = [];
      const w = window.innerWidth;
      const h = window.innerHeight;

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: (Math.random() - 0.5) * w * 1.5,
          y: (Math.random() - 0.5) * h * 1.5,
          z: Math.random() * depthRange,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          vz: -0.35 - Math.random() * 0.35, // Drifts forward toward camera in 3D
          baseSize: Math.random() * 2 + 1,
          hue: Math.random() > 0.4 ? 225 : 265, // Cyber blue & royal purple
          alpha: Math.random() * 0.5 + 0.3,
        });
      }
    };

    let lastTime = performance.now();

    const draw = (currentTime: number) => {
      if (document.hidden) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Smooth mouse lerping for cinematic 3D parallax tilt
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const tiltX = (mouseRef.current.x / w - 0.5) * 0.35;
      const tiltY = (mouseRef.current.y / h - 0.5) * 0.35;

      const projected: Array<{ px: number; py: number; scale: number; p: Particle3D }> = [];

      // Update positions & project to 2D
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.z += p.vz * 60 * dt;

        // Loop depth
        if (p.z <= -fov + 20) {
          p.z = depthRange;
          p.x = (Math.random() - 0.5) * w * 1.5;
          p.y = (Math.random() - 0.5) * h * 1.5;
        } else if (p.z > depthRange) {
          p.z = -fov + 30;
        }

        // Apply 3D rotation based on parallax
        const cosY = Math.cos(tiltX);
        const sinY = Math.sin(tiltX);
        const rx = p.x * cosY - p.z * sinY;
        const rz = p.x * sinY + p.z * cosY;

        const cosX = Math.cos(tiltY);
        const sinX = Math.sin(tiltY);
        const ry = p.y * cosX - rz * sinX;
        const finalZ = p.y * sinX + rz * cosX;

        const depth = finalZ + fov;
        if (depth <= 10) continue;

        const scale = fov / depth;
        const px = cx + rx * scale;
        const py = cy + ry * scale;

        // Skip off-screen projected points
        if (px < -80 || px > w + 80 || py < -80 || py > h + 80) continue;

        projected.push({ px, py, scale, p });
      }

      // 3D Connecting Lines between nearby nodes
      const maxConnectDist = isMobile ? 85 : 125;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        for (let j = i + 1; j < projected.length; j++) {
          const p2 = projected[j];
          const dx = p1.p.x - p2.p.x;
          const dy = p1.p.y - p2.p.y;
          const dz = p1.p.z - p2.p.z;
          const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist3D < maxConnectDist) {
            const alpha = (1 - dist3D / maxConnectDist) * 0.16 * Math.min(p1.scale, p2.scale);
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.strokeStyle = `rgba(130, 160, 245, ${alpha})`;
            ctx.lineWidth = Math.max(0.4, 0.8 * Math.min(p1.scale, p2.scale));
            ctx.stroke();
          }
        }
      }

      // Draw projected particles with depth-based glow
      for (let i = 0; i < projected.length; i++) {
        const { px, py, scale, p } = projected[i];
        const radius = Math.max(0.6, p.baseSize * scale);
        const alpha = Math.min(1, p.alpha * scale * 1.2);

        // Core dot
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${alpha})`;
        ctx.fill();

        // Subtle glowing halo for foreground particles
        if (scale > 0.8) {
          ctx.beginPath();
          ctx.arc(px, py, radius * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 85%, 60%, ${alpha * 0.15})`;
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouseRef.current.targetX = e.touches[0].clientX;
        mouseRef.current.targetY = e.touches[0].clientY;
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = window.innerWidth / 2;
      mouseRef.current.targetY = window.innerHeight / 2;
    };

    // Center start
    mouseRef.current.targetX = window.innerWidth / 2;
    mouseRef.current.targetY = window.innerHeight / 2;
    mouseRef.current.x = mouseRef.current.targetX;
    mouseRef.current.y = mouseRef.current.targetY;

    init();
    rafRef.current = requestAnimationFrame(draw);

    window.addEventListener('resize', init);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', init);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
