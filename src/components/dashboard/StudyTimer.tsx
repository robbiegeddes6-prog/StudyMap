import { useState } from "react";
import { Play, Pause, RotateCcw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudySession } from "@/hooks/useStudySession";
import { toast } from "sonner";

export function StudyTimer() {
  const {
    isRunning,
    remainingSeconds,
    totalSeconds,
    getFormattedTime,
    getProgressPercentage,
    startSession,
    pauseSession,
    resumeSession,
    resetSession,
  } = useStudySession();

  const [durationInput, setDurationInput] = useState<string>("25");

  const handleStart = () => {
    const duration = parseInt(durationInput, 10);
    if (isNaN(duration) || duration <= 0) {
      toast.error("Please enter a valid duration in minutes");
      return;
    }
    startSession(duration);
    toast.success(`Study session started! ${duration} minutes`);
  };

  const handlePause = () => {
    pauseSession();
    toast.info("Study session paused");
  };

  const handleResume = () => {
    resumeSession();
    toast.success("Study session resumed");
  };

  const handleReset = () => {
    resetSession();
    setDurationInput("25");
    toast.info("Study session reset");
  };

  const progressPercentage = getProgressPercentage();
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  const isSessionActive = totalSeconds > 0;

  return (
    <div className="studymap-card-elevated">
      <div className="flex items-center justify-center mb-6">
        <h3 className="text-lg font-semibold text-foreground">Focus Timer</h3>
      </div>

      {/* Circular Timer */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
            <circle
              cx="70"
              cy="70"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted-foreground"
            />
            <circle
              cx="70"
              cy="70"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="text-primary transition-all duration-100"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground font-mono">
                {getFormattedTime()}
              </div>
              {isSessionActive && (
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(progressPercentage)}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {!isSessionActive ? (
          <>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Minutes"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                min="1"
                max="180"
                className="flex-1"
              />
              <Button
                onClick={handleStart}
                className="flex-1"
                variant="default"
              >
                <Play className="w-4 h-4 mr-2" />
                Start
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              {isRunning ? (
                <Button
                  onClick={handlePause}
                  className="flex-1"
                  variant="outline"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={handleResume}
                  className="flex-1"
                  variant="outline"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              <Button
                onClick={handleReset}
                variant="outline"
                size="icon"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-center text-muted-foreground">
              {remainingSeconds > 0
                ? `${remainingSeconds} seconds remaining`
                : "Session completed!"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
