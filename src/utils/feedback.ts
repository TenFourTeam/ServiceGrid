/**
 * Audio/Haptic feedback utilities for instant user feedback
 * Uses Web Audio API for sounds and Vibration API for haptics
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('[feedback] Audio context not supported');
      return null;
    }
  }
  
  // Resume if suspended (browser autoplay policies)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  return audioContext;
}

function playTone(frequency: number, duration: number, volume: number = 0.08) {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = volume;
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently fail - audio is enhancement only
  }
}

function vibrate(pattern: number | number[] = 10) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Silently fail - haptics is enhancement only
    }
  }
}

export const feedback = {
  /**
   * Quick tap confirmation - minimal acknowledgment
   */
  tap: () => {
    playTone(440, 0.04, 0.04);
    vibrate(8);
  },
  
  /**
   * Success chirp - two ascending tones
   */
  success: () => {
    playTone(880, 0.08);
    setTimeout(() => playTone(1108, 0.12), 70);
    vibrate(40);
  },
  
  /**
   * Error/warning feedback
   */
  error: () => {
    playTone(220, 0.15, 0.1);
    vibrate([30, 50, 30]);
  },
  
  /**
   * Step complete in a workflow - subtle confirmation
   */
  stepComplete: () => {
    playTone(660, 0.06, 0.05);
    vibrate(12);
  },
  
  /**
   * Workflow/process complete - satisfying completion sound
   */
  workflowComplete: () => {
    playTone(523, 0.1); // C5
    setTimeout(() => playTone(659, 0.1), 80); // E5
    setTimeout(() => playTone(784, 0.15), 160); // G5
    vibrate([40, 25, 40]);
  },
  
  /**
   * Lead captured - celebratory feedback
   */
  leadCaptured: () => {
    feedback.success();
  },
  
  /**
   * Item created (customer, request, quote, etc.)
   */
  itemCreated: () => {
    playTone(698, 0.08); // F5
    setTimeout(() => playTone(880, 0.1), 60); // A5
    vibrate(30);
  },
  
  /**
   * Optimistic update started - very subtle
   */
  optimisticStart: () => {
    vibrate(5);
  },
  
  /**
   * Optimistic update confirmed by server
   */
  optimisticConfirm: () => {
    playTone(880, 0.04, 0.03);
  },
};

export default feedback;
