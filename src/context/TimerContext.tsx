import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface ActiveSession {
  id: string;
  taskId: string;
  taskTitle: string;
  subject: string;
  duration: number; // minutes
  date: string;
}

interface TimerContextType {
  currentSession: ActiveSession | null;
  timeRemaining: number; // in seconds
  isRunning: boolean;
  isPaused: boolean;
  startSession: (session: ActiveSession) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  completeSession: (sessionId: string) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children, onSessionComplete }: { 
  children: React.ReactNode;
  onSessionComplete?: (sessionId: string) => void;
}) {
  const [currentSession, setCurrentSession] = useState<ActiveSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Timer countdown effect
  useEffect(() => {
    if (!isRunning || isPaused || timeRemaining <= 0) {
      if (timeRemaining <= 0 && currentSession && isRunning) {
        // Timer finished - complete the session
        onSessionComplete?.(currentSession.id);
        setCurrentSession(null);
        setTimeRemaining(0);
        setIsRunning(false);
        setIsPaused(false);
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, timeRemaining, currentSession, onSessionComplete]);

  const startSession = useCallback((session: ActiveSession) => {
    setCurrentSession(session);
    setTimeRemaining(session.duration * 60); // convert minutes to seconds
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
    setIsRunning(false);
  }, []);

  const resumeTimer = useCallback(() => {
    setIsPaused(false);
    setIsRunning(true);
  }, []);

  const stopTimer = useCallback(() => {
    setCurrentSession(null);
    setTimeRemaining(0);
    setIsRunning(false);
    setIsPaused(false);
  }, []);

  const completeSession = useCallback((sessionId: string) => {
    if (currentSession?.id === sessionId) {
      onSessionComplete?.(sessionId);
      setCurrentSession(null);
      setTimeRemaining(0);
      setIsRunning(false);
      setIsPaused(false);
    }
  }, [currentSession, onSessionComplete]);

  const value: TimerContextType = {
    currentSession,
    timeRemaining,
    isRunning,
    isPaused,
    startSession,
    pauseTimer,
    resumeTimer,
    stopTimer,
    completeSession,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within TimerProvider");
  }
  return context;
}
