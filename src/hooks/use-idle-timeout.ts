import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // warn 2 minutes before

export function useIdleTimeout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();
    
    // Warning timer
    warningRef.current = setTimeout(() => {
      // Could dispatch a custom event for UI warning
      window.dispatchEvent(new CustomEvent("idle-warning"));
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Logout timer
    timerRef.current = setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.href = "/login";
    }, IDLE_TIMEOUT_MS);
  }, [clearTimers]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    const throttledReset = throttle(resetTimer, 5000); // Throttle to avoid excessive calls
    
    events.forEach(e => document.addEventListener(e, throttledReset, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => document.removeEventListener(e, throttledReset));
      clearTimers();
    };
  }, [resetTimer, clearTimers]);
}

function throttle(fn: () => void, ms: number) {
  let lastCall = 0;
  return () => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn();
    }
  };
}
