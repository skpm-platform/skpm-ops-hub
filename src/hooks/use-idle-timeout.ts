import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // warn 2 minutes before
const ACTIVITY_THROTTLE_MS = 5000;

export function useIdleTimeout() {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    if (!user) return;

    clearTimers();

    warningRef.current = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("idle-warning"));
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    timerRef.current = window.setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.replace("/login");
    }, IDLE_TIMEOUT_MS);
  }, [clearTimers, user]);

  useEffect(() => {
    if (!user) {
      clearTimers();
      return;
    }

    const events: Array<keyof WindowEventMap> = ["mousedown", "keydown", "touchstart", "wheel", "focus"];
    const throttledReset = throttle(resetTimer, ACTIVITY_THROTTLE_MS);

    events.forEach((eventName) => window.addEventListener(eventName, throttledReset, { passive: true }));
    document.addEventListener("visibilitychange", throttledReset);
    resetTimer();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, throttledReset));
      document.removeEventListener("visibilitychange", throttledReset);
      clearTimers();
    };
  }, [user, resetTimer, clearTimers]);
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
