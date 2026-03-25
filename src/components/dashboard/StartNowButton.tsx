import { useState, useEffect, useCallback } from "react";
import { Play, Pause, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function StartNowButton() {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setIsActive(false);
            toast.success("Focus session complete! Great work 🎉");
            return 25 * 60;
          }
          // Burnout detection: >3 hours
          if (25 * 60 - s >= 180 * 60) {
            toast.warning("You've been studying for a while. Take a break!");
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }, []);

  const progress = ((25 * 60 - seconds) / (25 * 60)) * 100;

  if (!isActive) {
    return (
      <motion.div
        className="studymap-card-elevated flex flex-col items-center justify-center py-8"
        whileHover={{ scale: 1.01 }}
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "var(--gradient-primary)" }}>
          <Timer className="w-8 h-8 text-primary-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Ready to focus?</h3>
        <p className="text-sm text-muted-foreground mb-4">Start a 25-minute Pomodoro session</p>
        <Button
          size="lg"
          onClick={() => { setIsActive(true); setIsPaused(false); setSeconds(25 * 60); }}
          className="gap-2"
        >
          <Play className="w-4 h-4" />
          Start Now
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="studymap-card-elevated flex flex-col items-center justify-center py-8 relative overflow-hidden"
      >
        {/* Progress ring background */}
        <div className="absolute inset-0 opacity-5" style={{ background: "var(--gradient-primary)" }} />

        <div className="relative mb-4">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" className="stroke-muted" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              className="stroke-primary"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - progress / 100)}
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-foreground font-mono">
              {formatTime(seconds)}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {isPaused ? "Paused" : "Focus mode active"}
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className="gap-1"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setIsActive(false); setSeconds(25 * 60); }}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <Square className="w-3.5 h-3.5" />
            Stop
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
