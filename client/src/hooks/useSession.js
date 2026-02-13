import { useEffect, useCallback, useRef, useState } from 'react';

const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds
const WARNING_BEFORE = 30 * 1000; // Show warning 30 seconds before
const TOKEN_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
// const TOKEN_LIFETIME = 60 * 1000; // 1 minute for testing
// const IDLE_TIMEOUT = 10 * 1000; // 10 seconds for testing
// const WARNING_BEFORE = 5 * 1000; // 5 seconds warning for testing

export function useSession(onSessionExpired, onShowWarning) {
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionStart');
    localStorage.removeItem('lastActivity');
    onSessionExpired();
  }, [onSessionExpired]);

  // Check if token is expired
  const checkTokenExpiry = useCallback(() => {
    const sessionStart = localStorage.getItem('sessionStart');
    if (!sessionStart) return false;

    const sessionAge = Date.now() - parseInt(sessionStart);
    if (sessionAge > TOKEN_LIFETIME) {
      console.log('Token expired, logging out...');
      clearSession();
      return true;
    }
    return false;
  }, [clearSession]);

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    localStorage.setItem('lastActivity', Date.now().toString());
    setShowWarning(false);

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      console.log('Showing idle warning...');
      setShowWarning(true);
      if (onShowWarning) onShowWarning();
    }, IDLE_TIMEOUT - WARNING_BEFORE);

    // Set logout timer
    idleTimerRef.current = setTimeout(() => {
      console.log('Idle timeout reached, logging out...');
      setShowWarning(false);
      clearSession();
    }, IDLE_TIMEOUT);
  }, [clearSession, onShowWarning]);

  // Track user activity
  useEffect(() => {
    const activities = ['mousedown', 'keydown', 'touchstart', 'mousemove', 'click', 'scroll'];
    
    const handleActivity = () => {
      // Check if token is still valid before resetting timer
      if (!checkTokenExpiry()) {
        resetIdleTimer();
      }
    };

    // Check token expiry on mount
    if (checkTokenExpiry()) return;

    // Start idle timer
    resetIdleTimer();

    // Add event listeners
    activities.forEach(activity => {
      document.addEventListener(activity, handleActivity, true);
    });

    // Check token expiry periodically (every minute)
    const tokenCheckInterval = setInterval(() => {
      checkTokenExpiry();
    }, 60000);

    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, handleActivity, true);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      clearInterval(tokenCheckInterval);
    };
  }, [resetIdleTimer, checkTokenExpiry]);

  // Initialize session on login
  const initSession = useCallback(() => {
    localStorage.setItem('sessionStart', Date.now().toString());
    localStorage.setItem('lastActivity', Date.now().toString());
    resetIdleTimer();
  }, [resetIdleTimer]);

  return { initSession, clearSession, checkTokenExpiry, showWarning, setShowWarning };
}

// Helper to get session info
export function getSessionInfo() {
  const sessionStart = localStorage.getItem('sessionStart');
  const lastActivity = localStorage.getItem('lastActivity');
  
  if (!sessionStart) return null;

  const now = Date.now();
  const sessionAge = now - parseInt(sessionStart);
  const timeSinceActivity = now - parseInt(lastActivity || sessionStart);
  
  return {
    sessionAge,
    timeSinceActivity,
    isExpired: sessionAge > TOKEN_LIFETIME,
    isIdle: timeSinceActivity > IDLE_TIMEOUT,
    timeRemaining: Math.max(0, TOKEN_LIFETIME - sessionAge),
    idleTimeRemaining: Math.max(0, IDLE_TIMEOUT - timeSinceActivity)
  };
}

// Format time for display
export function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Expired';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
