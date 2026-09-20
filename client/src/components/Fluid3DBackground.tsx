import React, { useEffect, useRef } from 'react';

const Fluid3DBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    // Wavy curve data
    let time = 0;
    const waves = [
      { yOffset: height * 0.3, amplitude: 150, period: 0.002, speed: 0.01, colorStart: '#000000', colorEnd: '#333333' },
      { yOffset: height * 0.5, amplitude: 200, period: 0.0015, speed: 0.008, colorStart: '#1a1a1a', colorEnd: '#d4af37' }, // Gold accent
      { yOffset: height * 0.7, amplitude: 250, period: 0.001, speed: 0.005, colorStart: '#d4af37', colorEnd: '#000000' },
      { yOffset: height * 0.9, amplitude: 100, period: 0.003, speed: 0.015, colorStart: '#0f0f0f', colorEnd: '#4a3b00' }
    ];

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep dark background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        for (let x = 0; x <= width; x += 10) {
          // 3D-like parallax/sine wave formula
          const y = wave.yOffset + 
                    Math.sin(x * wave.period + time * wave.speed) * wave.amplitude * 
                    Math.cos(x * 0.001 - time * 0.005);
          ctx.lineTo(x, y);
        }
        
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        // 3D Shading effect via gradients
        const gradient = ctx.createLinearGradient(0, wave.yOffset - wave.amplitude, 0, height);
        gradient.addColorStop(0, wave.colorStart);
        gradient.addColorStop(1, wave.colorEnd);
        
        ctx.fillStyle = gradient;
        
        // Soft shadow for depth
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = -10;

        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });

      time += 1;
      requestAnimationFrame(draw);
    };

    draw();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
    />
  );
};

export default Fluid3DBackground;

