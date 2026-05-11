import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerState } from '@/types';

const TIMER_STORAGE_KEY = 'studymap-timer-state';
const SESSIONS_STORAGE_KEY = 'studymap-focus-sessions';

export const useStudySession = () => {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    remainingSeconds: 0,
    totalSeconds: 0,
    sessionId: undefined,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Load state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(TIMER_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimerState(parsed);
      } catch (e) {
        console.error('Failed to parse timer state from localStorage', e);
      }
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
  }, [timerState]);

  const handleSessionComplete = useCallback(async (sessionId?: string) => {
    if (sessionId) {
      try {
        // Update session in localStorage
        const sessions = JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) || '[]');
        const updatedSessions = sessions.map((session: any) =>
          session.id === sessionId
            ? { ...session, completed: true, end_time: new Date().toISOString() }
            : session
        );
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
      } catch (err) {
        console.error('Failed to mark session complete:', err);
      }
    }
  }, []);

  // Countdown logic
  useEffect(() => {
    if (!timerState.isRunning || timerState.remainingSeconds <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    lastTickRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastTickRef.current) / 1000);
      
      setTimerState((prev) => {
        const newRemaining = Math.max(0, prev.remainingSeconds - elapsed);
        
        // If timer finished
        if (newRemaining === 0 && prev.remainingSeconds > 0) {
          handleSessionComplete(prev.sessionId);
          return {
            ...prev,
            isRunning: false,
            remainingSeconds: 0,
          };
        }

        return {
          ...prev,
          remainingSeconds: newRemaining,
        };
      });

      lastTickRef.current = now;
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.remainingSeconds, handleSessionComplete]);

  const startSession = useCallback((durationMinutes: number, sessionId?: string) => {
    setTimerState({
      isRunning: true,
      remainingSeconds: durationMinutes * 60,
      totalSeconds: durationMinutes * 60,
      sessionId,
    });
  }, []);

  const pauseSession = useCallback(() => {
    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
    }));
  }, []);

  const resumeSession = useCallback(() => {
    setTimerState((prev) => ({
      ...prev,
      isRunning: true,
    }));
  }, []);

  const resetSession = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerState({
      isRunning: false,
      remainingSeconds: 0,
      totalSeconds: 0,
      sessionId: undefined,
    });
  }, []);

  const getFormattedTime = useCallback(() => {
    const minutes = Math.floor(timerState.remainingSeconds / 60);
    const seconds = timerState.remainingSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timerState.remainingSeconds]);

  const getProgressPercentage = useCallback(() => {
    if (timerState.totalSeconds === 0) return 0;
    return (timerState.remainingSeconds / timerState.totalSeconds) * 100;
  }, [timerState.remainingSeconds, timerState.totalSeconds]);

  return {
    ...timerState,
    startSession,
    pauseSession,
    resumeSession,
    resetSession,
    getFormattedTime,
    getProgressPercentage,
  };
};
