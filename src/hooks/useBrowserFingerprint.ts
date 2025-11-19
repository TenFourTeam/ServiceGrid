import { useEffect, useState } from 'react';
import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'roadmap_voter_id';

/**
 * Generate a stable browser fingerprint for anonymous voting
 * Uses browser characteristics to create a unique identifier
 * Falls back to UUID if fingerprinting fails
 */
export function useBrowserFingerprint() {
  const [fingerprint, setFingerprint] = useState<string>('');

  useEffect(() => {
    const generateFingerprint = () => {
      // Try to get existing fingerprint from localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFingerprint(stored);
        return;
      }

      try {
        // Collect browser characteristics
        const components = [
          navigator.userAgent,
          navigator.language,
          new Intl.DateTimeFormat().resolvedOptions().timeZone,
          screen.width + 'x' + screen.height,
          screen.colorDepth,
          window.devicePixelRatio,
        ];

        // Create hash from components
        const fingerprintString = components.join('|');
        const hash = CryptoJS.SHA256(fingerprintString).toString();

        // Store for future use
        localStorage.setItem(STORAGE_KEY, hash);
        setFingerprint(hash);
      } catch (error) {
        console.error('Error generating fingerprint:', error);
        // Fallback to random UUID
        const fallbackId = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, fallbackId);
        setFingerprint(fallbackId);
      }
    };

    generateFingerprint();
  }, []);

  return fingerprint;
}
