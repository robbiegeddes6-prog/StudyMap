import { useState, useEffect } from "react";
import { useTimer } from "@/context/TimerContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Pause, Play, Square, Clock } from "lucide-react";

interface FocusModeTimerProps {
  session: {
    id: string;
    taskId: string;
    taskTitle: string;
    subject: string;
    duration: number; // in minutes
    completed: boolean;
  };
  onClose: () => void;
}

export function FocusModeTimer({ session, onClose }: FocusModeTimerProps) {
  const { currentSession, timeRemaining, isRunning, isPaused, startSession, pauseTimer, resumeTimer, stopTimer } = useTimer();
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (!currentSession || currentSession.id !== session.id) {
      startSession({
        id: session.id,
        taskId: session.taskId,
        taskTitle: session.taskTitle,
        subject: session.subject,
        duration: session.duration,
        date: new Date().toISOString()
      });
    }
  }, [session, currentSession, startSession]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((session.duration * 60 - timeRemaining) / (session.duration * 60)) * 100;

  useEffect(() => {
    if (!currentSession && timeRemaining === 0 && !isRunning && !isPaused && showControls) {
      onClose();
    }
  }, [currentSession, timeRemaining, isRunning, isPaused, onClose, showControls]);

  const handleStop = () => {
    stopTimer();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">{session.subject}</h2>
            <p className="text-muted-foreground">{session.taskTitle}</p>
          </div>

          <div className="mb-8">
            <div className="text-6xl font-mono font-bold mb-4">
              {formatTime(timeRemaining)}
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {Math.round(progress)}% complete
            </p>
          </div>

          <div className="flex justify-center gap-4">
            {isRunning && !isPaused ? (
              <Button onClick={pauseTimer} size="lg" variant="outline">
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </Button>
            ) : (
              <Button onClick={resumeTimer} size="lg">
                <Play className="h-5 w-5 mr-2" />
                {isPaused ? "Resume" : "Start"}
              </Button>
            )}

            <Button onClick={handleStop} size="lg" variant="destructive">
              <Square className="h-5 w-5 mr-2" />
              Stop
            </Button>
          </div>

          <div className="mt-6 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 inline mr-1" />
            {session.duration >= 60 ? `${(session.duration / 60).toFixed(1)}h` : `${session.duration}m`} session
          </div>
        </CardContent>
      </Card>
    </div>
  );
}