import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, Square, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface FocusTimerProps {
  initialMinutes?: number;
  onComplete?: () => void;
  taskTitle?: string;
  sessionId?: string;
}

const PRESET_DURATIONS = [15, 30, 45, 60];

export function FocusTimer({
  initialMinutes = 30,
  onComplete,
  taskTitle = "Focus Session",
  sessionId,
}: FocusTimerProps) {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(initialMinutes);
  const [customMinutes, setCustomMinutes] = useState("30");
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialTimeRef = useRef(initialMinutes * 60);

  // Timer countdown effect - runs when isRunning changes
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only start if running and not paused
    if (!isRunning || isPaused) {
      return;
    }

    // Create new interval
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer complete - stop it
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRunning(false);
          setIsPaused(false);
          setIsFullscreen(false);
          setHasStarted(false);
          setTimeLeft(initialTimeRef.current);
          toast.success(`${taskTitle} complete! 🎉`);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup on unmount or when stopping
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused, onComplete, taskTitle]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleDurationSelect = (minutes: number) => {
    if (!hasStarted) {
      setSelectedDuration(minutes);
      setTimeLeft(minutes * 60);
      initialTimeRef.current = minutes * 60;
    }
  };

  const handleCustomDuration = () => {
    const mins = parseInt(customMinutes, 10);
    if (!isNaN(mins) && mins > 0 && !hasStarted) {
      setSelectedDuration(mins);
      setTimeLeft(mins * 60);
      initialTimeRef.current = mins * 60;
    }
  };

  const startTimer = () => {
    if (isRunning) return; // Don't start if already running
    if (!hasStarted) {
      setHasStarted(true);
      setIsFullscreen(true);
    }
    setIsRunning(true);
    setIsPaused(false);
  };

  const pauseTimer = () => {
    if (!isRunning) return;
    // Clear interval when pausing
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPaused(true);
    setIsRunning(false);
  };

  const resumeTimer = () => {
    if (isRunning) return; // Don't resume if already running
    setIsPaused(false);
    setIsRunning(true);
  };

  const stopTimer = () => {
    // Clear interval when stopping
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const initialDuration = selectedDuration || parseInt(customMinutes, 10) || initialMinutes;
    setTimeLeft(initialDuration * 60);
    initialTimeRef.current = initialDuration * 60;
    setIsRunning(false);
    setIsPaused(false);
    setHasStarted(false);
    setIsFullscreen(false);
  };

  const progress = selectedDuration
    ? ((selectedDuration * 60 - timeLeft) / (selectedDuration * 60)) * 100
    : 0;

  // Fullscreen mode when timer is running
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex items-center justify-center backdrop-blur-sm">
        <div className="absolute inset-0" onClick={stopTimer} />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 flex flex-col items-center justify-center py-12 px-6"
        >
          {/* Close button */}
          <button
            onClick={stopTimer}
            className="absolute top-8 right-8 p-2 hover:bg-muted rounded-lg transition"
          >
            <X className="w-6 h-6 text-muted-foreground" />
          </button>

          {/* Task title */}
          <p className="text-lg text-muted-foreground mb-8">{taskTitle}</p>

          {/* Large timer display */}
          <div className="relative mb-12">
            <svg width="280" height="280" viewBox="0 0 280 280" className="drop-shadow-lg">
              {/* Background circle */}
              <circle
                cx="140"
                cy="140"
                r="130"
                fill="none"
                className="stroke-muted"
                strokeWidth="12"
              />
              {/* Progress circle */}
              <circle
                cx="140"
                cy="140"
                r="130"
                fill="none"
                className={isRunning && !isPaused ? "stroke-red-500" : "stroke-primary"}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 130}
                strokeDashoffset={2 * Math.PI * 130 * (1 - progress / 100)}
                transform="rotate(-90 140 140)"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>

            {/* Timer text - huge */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`text-7xl font-bold font-mono ${
                  isRunning && !isPaused ? "text-red-500 animate-pulse" : "text-foreground"
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Status */}
          <p className="text-lg text-muted-foreground mb-12">
            {isPaused ? "⏸️ Paused" : isRunning ? "🔴 Focus Mode Active" : "Ready"}
          </p>

          {/* Controls */}
          <div className="flex gap-4">
            {!isRunning ? (
              <Button
                size="lg"
                onClick={resumeTimer}
                className="gap-2 h-12 px-6 text-lg"
              >
                <Play className="w-5 h-5" />
                {isPaused ? "Resume" : "Start"}
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                onClick={pauseTimer}
                className="gap-2 h-12 px-6 text-lg"
              >
                <Pause className="w-5 h-5" />
                Pause
              </Button>
            )}

            <Button
              size="lg"
              variant="outline"
              onClick={stopTimer}
              className="gap-2 h-12 px-6 text-lg text-destructive hover:text-destructive"
            >
              <Square className="w-5 h-5" />
              Stop
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Duration selection screen
  if (!hasStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="studymap-card-elevated flex flex-col items-center justify-center py-8"
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-primary/10">
          <Clock className="w-8 h-8 text-primary" />
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-1">Ready to focus?</h3>
        <p className="text-sm text-muted-foreground mb-6">{taskTitle}</p>

        <div className="w-full max-w-sm space-y-4">
          {/* Preset buttons */}
          <div className="grid grid-cols-2 gap-2">
            {PRESET_DURATIONS.map((duration) => (
              <Button
                key={duration}
                variant={selectedDuration === duration ? "default" : "outline"}
                onClick={() => handleDurationSelect(duration)}
                className="text-sm"
              >
                {duration}m
              </Button>
            ))}
          </div>

          {/* Custom duration */}
          <div className="flex gap-2 pt-2">
            <Input
              type="number"
              min="1"
              max="300"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              placeholder="Custom minutes"
              className="flex-1"
              disabled={isRunning || isPaused}
            />
            <Button
              variant="outline"
              onClick={handleCustomDuration}
              className="px-3"
              disabled={isRunning || isPaused}
            >
              Set
            </Button>
          </div>

          {/* Start button */}
          <Button
            size="lg"
            onClick={startTimer}
            className="w-full gap-2 mt-4"
          >
            <Play className="w-4 h-4" />
            Start Focus ({formatTime((selectedDuration || parseInt(customMinutes, 10) || initialMinutes) * 60)})
          </Button>
        </div>
      </motion.div>
    );
  }

  // Timer active screen
  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="studymap-card-elevated flex flex-col items-center justify-center py-12 relative overflow-hidden"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 opacity-5" />

        {/* Task title */}
        <p className="text-sm text-muted-foreground mb-6">{taskTitle}</p>

        {/* Circular progress + timer display */}
        <div className="relative mb-8">
          <svg width="160" height="160" viewBox="0 0 160 160">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              className="stroke-muted"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              className={isRunning && !isPaused ? "stroke-red-500" : "stroke-primary"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 70}
              strokeDashoffset={2 * Math.PI * 70 * (1 - progress / 100)}
              transform="rotate(-90 80 80)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>

          {/* Timer text in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`text-4xl font-bold font-mono ${
                isRunning && !isPaused ? "text-red-500 animate-pulse" : "text-foreground"
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Status */}
        <p className="text-sm text-muted-foreground mb-6">
          {isPaused ? "⏸️ Paused" : isRunning ? "🔴 Focus mode active" : "Ready"}
        </p>

        {/* Controls */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button
              variant="default"
              size="sm"
              onClick={resumeTimer}
              className="gap-1"
            >
              <Play className="w-4 h-4" />
              {isPaused ? "Resume" : "Start"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={pauseTimer}
              className="gap-1"
            >
              <Pause className="w-4 h-4" />
              Pause
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={stopTimer}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <Square className="w-4 h-4" />
            Stop
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
