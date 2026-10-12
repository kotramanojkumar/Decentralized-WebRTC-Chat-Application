import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { parrotAudio } from '../utils/parrotAudio';

interface InteractiveParrotProps {
  isFocusEmail?: boolean;
  isFocusPassword?: boolean;
  isFocusName?: boolean;
  showPassword?: boolean;
  textLength?: number;
  isCelebrating?: boolean;
  onCelebrationComplete?: () => void;
}

type ParrotActionState = 'sitting' | 'falling' | 'flying-in' | 'landing' | 'celebrating';

export default function InteractiveParrot({
  isFocusEmail = false,
  isFocusPassword = false,
  isFocusName = false,
  showPassword = false,
  textLength = 0,
  isCelebrating = false,
  onCelebrationComplete,
}: InteractiveParrotProps) {
  const parrotRef = useRef<HTMLDivElement>(null);

  // Animation Action State
  const [actionState, setActionState] = useState<ParrotActionState>('sitting');

  // Mouse Tracking States
  const [headRotation, setHeadRotation] = useState(0); // Left/Right turn (-26 to +26 deg)
  const [headTiltY, setHeadTiltY] = useState(8); // Pitch DOWN towards inputs (0 to 20 deg)
  const [wingFlutter, setWingFlutter] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Trigger Celebration Flight when isCelebrating prop activates
  useEffect(() => {
    if (isCelebrating && actionState !== 'celebrating') {
      setActionState('celebrating');
      parrotAudio.playCelebrationSound();

      // Complete celebration flight after 1.8 seconds
      const timer = setTimeout(() => {
        setActionState('sitting');
        if (onCelebrationComplete) {
          onCelebrationComplete();
        }
      }, 1900);
      return () => clearTimeout(timer);
    }
  }, [isCelebrating, onCelebrationComplete]);

  // Idle Wing & Breathing Animation
  useEffect(() => {
    let animationFrameId: number;
    let tick = 0;

    const animateIdle = () => {
      tick += 0.05;
      if (actionState === 'sitting') {
        const idleWobble = Math.sin(tick) * 2.5;
        setWingFlutter(idleWobble);
      }
      animationFrameId = requestAnimationFrame(animateIdle);
    };

    animationFrameId = requestAnimationFrame(animateIdle);
    return () => cancelAnimationFrame(animationFrameId);
  }, [actionState]);

  // Mouse Movement Tracking: Head rotation & looking DOWN at inputs
  useEffect(() => {
    let lastFlapTime = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (actionState !== 'sitting' || !parrotRef.current) return;
      const rect = parrotRef.current.getBoundingClientRect();
      const parrotX = rect.left + rect.width / 2;
      const parrotY = rect.top + rect.height / 2;

      const dx = e.clientX - parrotX;
      const dy = e.clientY - parrotY; // Positive when mouse is below the parrot (over form inputs)

      // 1. Turn head and body left/right towards mouse (-24 to +24 deg)
      const rot = Math.max(-24, Math.min(24, (dx / (window.innerWidth / 2)) * 28));
      setHeadRotation(rot);

      // 2. Pitch head DOWN when mouse is lower on the screen (over email/password inputs!)
      const tilt = Math.max(-2, Math.min(22, (dy / (window.innerHeight / 2)) * 24));
      setHeadTiltY(tilt);

      // 3. Wing reaction to fast mouse movement
      const speed = Math.hypot(e.movementX, e.movementY);
      const now = performance.now();
      if (speed > 5 && now - lastFlapTime > 60) {
        lastFlapTime = now;
        const flap = Math.min(18, speed * 0.9);
        setWingFlutter(Math.random() > 0.5 ? flap : -flap);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [actionState]);

  // Handle Tap: Fall from up, then come back and sit!
  const handleParrotTap = () => {
    if (actionState !== 'sitting') return;

    // Phase 1: Parrot loses balance and falls down!
    setActionState('falling');
    parrotAudio.playFallSound();

    // Phase 2: After tumbling, swoops back in from above!
    setTimeout(() => {
      setActionState('flying-in');
      parrotAudio.playFlapSound();
    }, 600);

    // Phase 3: Parrot lands on feet with a joyful bounce!
    setTimeout(() => {
      setActionState('landing');
    }, 1450);

    // Phase 4: Sits back comfortably on the card rim
    setTimeout(() => {
      setActionState('sitting');
    }, 2100);
  };

  // Dynamic Speech Bubble based on state & input focus
  let speechBubble = "🦜 Tap me to tumble! Or type below!";
  if (actionState === 'falling') {
    speechBubble = "😱 WHOAAA! I'm falling down!";
  } else if (actionState === 'flying-in') {
    speechBubble = "🪽 *Flap flap flap* Flying back up!";
  } else if (actionState === 'landing') {
    speechBubble = "🦜 Phew! Safe landing on the perch!";
  } else if (actionState === 'celebrating') {
    speechBubble = "🎉 OH WHOAAA! Flying happily! Wheee! 🪽";
  } else if (isFocusPassword && !showPassword) {
    speechBubble = "🙈 SQUAWK! Covering my eyes!";
  } else if (isFocusPassword && showPassword) {
    speechBubble = "👀 Ooh! I see your password!";
  } else if (isFocusEmail) {
    speechBubble = "🦜 Looking down at your email!";
  } else if (isFocusName) {
    speechBubble = "🦜 Looking down at your name!";
  } else if (isHovered) {
    speechBubble = "✨ Chirp! Tap me to see me fall!";
  }

  // Wing & Body posture offsets when typing
  const typingWiggle = (textLength % 2 === 0 ? 3 : -3);
  const currentRotation = actionState === 'sitting'
    ? headRotation + (isFocusEmail || isFocusName ? typingWiggle : 0)
    : 0;

  // Screen celebration flight path dimensions
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 800;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 600;

  // Framer Motion Variants
  const parrotMotionVariants: Variants = {
    sitting: {
      y: 0,
      x: 0,
      rotate: currentRotation,
      scale: 1,
      opacity: 1,
      transition: { duration: 0.25 }
    },
    falling: {
      y: 190, // Tumbles down past card rim
      x: 30,
      rotate: 155, // Comedic tumble
      scale: 0.75,
      opacity: 0,
      transition: { duration: 0.55, ease: 'easeIn' }
    },
    'flying-in': {
      y: [-180, 0], // Swoops in from high above
      x: [0, 0],
      rotate: [-15, 0],
      scale: [0.85, 1],
      opacity: [0, 1],
      transition: { duration: 0.8, ease: 'easeOut' }
    },
    landing: {
      y: [0, -12, 0], // Landing bounce on perch
      rotate: [0, 5, -2, 0],
      scale: [1, 1.08, 1],
      opacity: 1,
      transition: { duration: 0.5 }
    },
    celebrating: {
      // Full screen joyful figure-8 flight path!
      x: [0, -screenW * 0.32, screenW * 0.32, -screenW * 0.22, screenW * 0.15, 0],
      y: [0, -screenH * 0.36, -screenH * 0.18, -screenH * 0.44, -screenH * 0.25, 0],
      rotate: [0, -28, 32, -22, 18, 0],
      scale: [1, 1.35, 1.45, 1.3, 1.15, 1],
      opacity: 1,
      transition: {
        duration: 1.85,
        ease: 'easeInOut',
        times: [0, 0.22, 0.48, 0.72, 0.9, 1]
      }
    }
  };

  return (
    <div
      ref={parrotRef}
      className={`relative w-48 h-40 mx-auto -mb-6 flex flex-col items-center justify-end select-none ${
        actionState === 'celebrating' ? 'z-50 pointer-events-none' : 'z-20 pointer-events-auto cursor-pointer'
      }`}
      onMouseEnter={() => {
        setIsHovered(true);
        if (actionState === 'sitting') parrotAudio.playChirp();
      }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleParrotTap}
    >
      {/* Dynamic Floating Speech Bubble */}
      <AnimatePresence>
        <motion.div
          key={speechBubble}
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 3, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`mb-1 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-emerald-500/25 dark:border-emerald-400/25 text-xs font-semibold text-neutral-800 dark:text-neutral-100 shadow-xl flex items-center gap-1.5 whitespace-nowrap z-30 ${
            actionState === 'celebrating' ? 'scale-110 shadow-emerald-500/30' : ''
          }`}
        >
          <span>{speechBubble}</span>
          {/* Bubble tail pointing down */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-neutral-900 border-r border-b border-emerald-500/25 dark:border-emerald-400/25 rotate-45 -mt-1" />
        </motion.div>
      </AnimatePresence>

      {/* Celebratory Sparkle Particles when Flying Happily */}
      {actionState === 'celebrating' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <motion.span
            animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0], x: [-30, -70], y: [-20, -50] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="text-xl"
          >
            ✨
          </motion.span>
          <motion.span
            animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0], x: [30, 70], y: [-30, -60] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: 0.2 }}
            className="text-xl"
          >
            ⭐
          </motion.span>
          <motion.span
            animate={{ scale: [0, 1.3, 0], opacity: [0, 1, 0], y: [-40, -80] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: 0.4 }}
            className="text-lg"
          >
            🌟
          </motion.span>
        </div>
      )}

      {/* Main Parrot Character Container with Motion Animation */}
      <motion.div
        variants={parrotMotionVariants}
        animate={actionState}
        className="relative w-36 h-34 flex items-center justify-center overflow-visible"
        style={{
          // Looking DOWN at input fields when in sitting mode
          transformOrigin: 'center 85%',
          perspective: 600,
        }}
      >
        <div
          className="relative w-full h-full flex items-center justify-center transition-transform duration-100"
          style={{
            // Tilt forward/down when looking at inputs below
            transform: actionState === 'sitting'
              ? `rotateX(${headTiltY}deg) translateY(${headTiltY * 0.35}px)`
              : 'none',
          }}
        >
          {/* High-Resolution 3D Transparent Parrot Image */}
          <img
            src="/parrot.png"
            alt="Interactive Pixar Parrot"
            className={`w-full h-full object-contain filter drop-shadow-xl transition-transform duration-150 ${
              isFocusPassword && !showPassword ? 'scale-95 brightness-95' : 'scale-100'
            }`}
            style={{
              transform: `rotate(${wingFlutter * 0.4}deg)`,
            }}
            draggable={false}
          />

          {/* Privacy Blinder badge when password is focused */}
          {isFocusPassword && !showPassword && actionState === 'sitting' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 bg-neutral-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap z-20"
            >
              🙈 Eyes Covered
            </motion.div>
          )}

          {/* Looking Down indicator badge when email/name focused */}
          {(isFocusEmail || isFocusName) && actionState === 'sitting' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap z-20"
            >
              👀 Looking Down
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
