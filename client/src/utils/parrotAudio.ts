// Sound Synthesizer & Speech Engine for P2PConnect
class SoundEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Resolves the highest quality natural female voice (Siri, Samantha, Zira, Jenny, Aria, Neerja)
  getBestFemaleVoice(): SpeechSynthesisVoice | null {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Ordered list of top female voice identifiers across Apple, Windows, Chrome, and Android
    const femaleSignatures = [
      'siri',
      'samantha',
      'zira',
      'jenny',
      'aria',
      'neerja',
      'heera',
      'sonia',
      'victoria',
      'karen',
      'moira',
      'stephanie',
      'google uk english female',
      'female'
    ];

    for (const sig of femaleSignatures) {
      const match = voices.find(
        v => v.name.toLowerCase().includes(sig) && v.lang.startsWith('en')
      );
      if (match) return match;
    }

    // Secondary: Any English voice with "natural" in the name
    const naturalVoice = voices.find(
      v => v.lang.startsWith('en') && v.name.toLowerCase().includes('natural')
    );
    if (naturalVoice) return naturalVoice;

    // Fallback: First English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  }

  // Speaks any text with a clear, polite female tone & Siri/Zira voice
  speakFemale(text: string, onEnd?: () => void) {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.22; // Melodic, clear female register
        utterance.volume = 1.0;

        const voice = this.getBestFemaleVoice();
        if (voice) {
          utterance.voice = voice;
        }

        if (onEnd) {
          utterance.onend = onEnd;
        }

        window.speechSynthesis.speak(utterance);
      }
    } catch (_) {}
  }

  // 1. Text-To-Speech Welcome Voice: Speaks "Welcome back, {Name}!" aloud in natural female voice!
  speakWelcome(name: string) {
    try {
      this.playCelebrationSound();
      const cleanName = name ? name.replace(/[^\w\s]/gi, '').trim() : 'Friend';
      setTimeout(() => {
        this.speakFemale(`Welcome back, ${cleanName}!`);
      }, 260);
    } catch (_) {}
  }

  // 2. Recording Started Sound Tone
  playRecordStart() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (_) {}
  }

  // 3. Recording Stopped / Saved Sound Tone
  playRecordStop() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.14);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (_) {}
  }

  // 4. Message Sent / Received Pop
  playMessagePop() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.09);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (_) {}
  }

  // 5. Friendly Robot Chirp / Beep
  playChirp() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1750, now);
      osc.frequency.exponentialRampToValueAtTime(2500, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(1850, now + 0.14);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (_) {}
  }

  // Play tumbling fall sound (slide whistle down)
  playFallSound() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.45);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (_) {}
  }

  // Play wings flapping swoop sound
  playFlapSound() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const flapTime = now + i * 0.14;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, flapTime);
        osc.frequency.exponentialRampToValueAtTime(180, flapTime + 0.1);
        gain.gain.setValueAtTime(0.25, flapTime);
        gain.gain.exponentialRampToValueAtTime(0.01, flapTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(flapTime);
        osc.stop(flapTime + 0.1);
      }
    } catch (_) {}
  }

  // 6. Celebratory Chime & Harmonized Arpeggios
  playCelebrationSound() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // "Oh-whoooo!" slide whistle upward
      const whooOsc = this.ctx.createOscillator();
      const whooGain = this.ctx.createGain();
      whooOsc.type = 'sine';
      whooOsc.frequency.setValueAtTime(360, now);
      whooOsc.frequency.exponentialRampToValueAtTime(920, now + 0.45);
      whooOsc.frequency.exponentialRampToValueAtTime(1250, now + 0.9);
      whooGain.gain.setValueAtTime(0.24, now);
      whooGain.gain.linearRampToValueAtTime(0.32, now + 0.5);
      whooGain.gain.exponentialRampToValueAtTime(0.01, now + 1.25);
      whooOsc.connect(whooGain);
      whooGain.connect(this.ctx.destination);
      whooOsc.start(now);
      whooOsc.stop(now + 1.25);

      // Joyful celebratory notes (C5 - E5 - G5 - C6 - E6)
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      notes.forEach((freq, idx) => {
        const noteTime = now + 0.2 + idx * 0.15;
        const noteOsc = this.ctx!.createOscillator();
        const noteGain = this.ctx!.createGain();
        noteOsc.type = 'triangle';
        noteOsc.frequency.setValueAtTime(freq, noteTime);
        noteOsc.frequency.exponentialRampToValueAtTime(freq * 1.04, noteTime + 0.12);
        noteGain.gain.setValueAtTime(0.2, noteTime);
        noteGain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.28);
        noteOsc.connect(noteGain);
        noteGain.connect(this.ctx!.destination);
        noteOsc.start(noteTime);
        noteOsc.stop(noteTime + 0.28);
      });
    } catch (_) {}
  }
}

export const soundEngine = new SoundEngine();
// Retain backward compatibility with parrotAudio export
export const parrotAudio = soundEngine;
