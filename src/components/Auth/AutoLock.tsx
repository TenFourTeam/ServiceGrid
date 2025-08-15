import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";

// Auto-lock system with cross-tab sync and activity tracking
export default function AutoLock() {
  const { isSignedIn, signOut } = useAuth();
  const idleTimeoutRef = useRef<NodeJS.Timeout>();
  const activityTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef(Date.now());
  const channelRef = useRef<BroadcastChannel>();

  const IDLE_TIMEOUT = 20 * 60 * 1000; // 20 minutes
  const ACTIVITY_CHECK_INTERVAL = 30 * 1000; // 30 seconds

  useEffect(() => {
    if (!isSignedIn) return;

    // Initialize broadcast channel for cross-tab sync
    channelRef.current = new BroadcastChannel('auth-activity');
    
    const resetActivityTimer = () => {
      lastActivityRef.current = Date.now();
      
      // Clear existing timers
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
      
      // Broadcast activity to other tabs
      channelRef.current?.postMessage({ type: 'activity', timestamp: Date.now() });
      
      // Set new idle timeout
      idleTimeoutRef.current = setTimeout(() => {
        signOut();
      }, IDLE_TIMEOUT);
      
      // Set activity check timer
      activityTimeoutRef.current = setTimeout(checkActivity, ACTIVITY_CHECK_INTERVAL);
    };

    const checkActivity = () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity >= IDLE_TIMEOUT) {
        signOut();
      } else {
        // Schedule next check
        activityTimeoutRef.current = setTimeout(checkActivity, ACTIVITY_CHECK_INTERVAL);
      }
    };

    // Listen for cross-tab activity
    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data.type === 'activity' && event.data.timestamp > lastActivityRef.current) {
        lastActivityRef.current = event.data.timestamp;
        resetActivityTimer();
      }
    };

    // Activity event listeners
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const throttledReset = throttle(resetActivityTimer, 1000);
    
    activityEvents.forEach(event => {
      document.addEventListener(event, throttledReset, { passive: true });
    });

    channelRef.current.addEventListener('message', handleChannelMessage);
    
    // Initialize timer
    resetActivityTimer();

    return () => {
      // Cleanup
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
      
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledReset);
      });
      
      channelRef.current?.removeEventListener('message', handleChannelMessage);
      channelRef.current?.close();
    };
  }, [isSignedIn, signOut]);

  return null;
}

// Simple throttle utility
function throttle(func: Function, delay: number) {
  let timeoutId: NodeJS.Timeout;
  let lastExecTime = 0;
  
  return function (this: any, ...args: any[]) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}
