import { useState, useEffect } from 'react';

export interface WebGLSupportState {
  isWebGLSupported: boolean;
  isWebGL2Supported: boolean;
  prefersReducedMotion: boolean;
  canRender3D: boolean;
  tier: 'high' | 'medium' | 'fallback';
  rendererInfo?: string;
}

/**
 * Pure utility function to probe WebGL availability synchronously.
 */
export function probeWebGLSupport(): {
  supported: boolean;
  webgl2: boolean;
  rendererInfo?: string;
} {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { supported: false, webgl2: false };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      const debugInfo = gl2.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl2.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : undefined;
      return { supported: true, webgl2: true, rendererInfo: renderer };
    }

    const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl1) {
      return { supported: true, webgl2: false };
    }

    return { supported: false, webgl2: false };
  } catch (err) {
    return { supported: false, webgl2: false };
  }
}

/**
 * React hook to reactively track WebGL hardware acceleration & reduced-motion preference.
 */
export function useWebGLSupport(): WebGLSupportState {
  const [state, setState] = useState<WebGLSupportState>(() => {
    const probe = probeWebGLSupport();
    const prefersReducedMotion =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    const canRender3D = probe.supported && !prefersReducedMotion;
    const tier: 'high' | 'medium' | 'fallback' = !canRender3D
      ? 'fallback'
      : probe.webgl2
      ? 'high'
      : 'medium';

    return {
      isWebGLSupported: probe.supported,
      isWebGL2Supported: probe.webgl2,
      prefersReducedMotion,
      canRender3D,
      tier,
      rendererInfo: probe.rendererInfo,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateMotion = (e: MediaQueryListEvent | MediaQueryList) => {
      setState((prev) => {
        const prefersReducedMotion = e.matches;
        const canRender3D = prev.isWebGLSupported && !prefersReducedMotion;
        return {
          ...prev,
          prefersReducedMotion,
          canRender3D,
          tier: !canRender3D ? 'fallback' : prev.isWebGL2Supported ? 'high' : 'medium',
        };
      });
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMotion);
    } else {
      mediaQuery.addListener(updateMotion);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateMotion);
      } else {
        mediaQuery.removeListener(updateMotion);
      }
    };
  }, []);

  return state;
}

export default useWebGLSupport;
