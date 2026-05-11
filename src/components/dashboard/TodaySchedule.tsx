import { Clock, CheckCircle2, Circle, Loader2, Trash2, Play, Pause, Square, Focus, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTaskContext } from "@/context/TaskContext";
import { useTimer } from "@/context/TimerContext";
import { SUBJECT_ICONS } from "@/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FocusModeTimer } from "@/components/FocusModeTimer";
import { formatSessionDuration } from "@/lib/studyUtils";
import { differenceInDays, format } from "date-fns";

interface TodaySession {
  taskId: string;
  taskTitle: string;
  subject: string;
  sessionId: string;
  sessionDate: Date;
  duration: number;
  completed: boolean;
  dueDate?: Date;
}

export function TodaySchedule() {
  const { getTodayStudySessions, toggleSessionComplete, getTaskUrgencies, deleteSession, removeTask } = useTaskContext();
  const { currentSession, timeRemaining, isRunning, isPaused, startSession, pauseTimer, resumeTimer, stopTimer } = useTimer();
  const [sessions, setSessions] = useState<TodaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusModeSession, setFocusModeSession] = useState<TodaySession | null>(null);
  const [daysUntilDue, setDaysUntilDue] = useState<Record<string, number>>({});

  useEffect(() => {
    setLoading(true);
    const todaySessions = getTodayStudySessions();
    setSessions(todaySessions || []);
    
    // Calculate days until due for each task
    const days: Record<string, number> = {};
    todaySessions?.forEach((session) => {
      if (!days[session.taskId] && session.dueDate) {
        const dueDate = session.dueDate instanceof Date ? session.dueDate : new Date(session.dueDate);
        days[session.taskId] = differenceInDays(dueDate, new Date());
      }
    });
    setDaysUntilDue(days);
    
    setLoading(false);
  }, [getTodayStudySessions]);

  // Refresh sessions when timer completes a session
  useEffect(() => {
    if (!currentSession) {
      const todaySessions = getTodayStudySessions();
      setSessions(todaySessions || []);
    }
  }, [currentSession, getTodayStudySessions]);

  const toggleComplete = (taskId: string, sessionId: string, currentCompleted: boolean) => {
    toggleSessionComplete(taskId, sessionId);
    setSessions((prev) =>
      prev.map((s) =>
        s.sessionId === sessionId
          ? { ...s, completed: !s.completed }
          : s
      )
    );

    toast.success(!currentCompleted ? "Session marked complete! 🎉" : "Session unmarked");
  };

  const handleDeleteSession = (taskId: string, sessionId: string) => {
    deleteSession(taskId, sessionId);
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    toast.success("Session removed");
  };

  const handleRemoveTask = (taskId: string) => {
    removeTask(taskId);
    setSessions((prev) => prev.filter((s) => s.taskId !== taskId));
    toast.success("Task and all sessions removed");
  };

  const handleFocusMode = (session: TodaySession) => {
    setFocusModeSession(session);
  };

  const handleCloseFocusMode = () => {
    setFocusModeSession(null);
  };

  const getUrgencyColor = (taskId: string) => {
    const urgencies = getTaskUrgencies();
    const urgency = urgencies.find(u => u.taskId === taskId);
    switch (urgency?.level) {
      case "red": return "border-red-500 bg-red-50 dark:bg-red-950/20";
      case "yellow": return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      default: return "border-green-500 bg-green-50 dark:bg-green-950/20";
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartSession = (session: TodaySession) => {
    startSession({
      id: session.sessionId,
      taskId: session.taskId,
      taskTitle: session.taskTitle,
      subject: session.subject,
      duration: session.duration,
      date: session.sessionDate.toISOString(),
    });
    toast.success(`Timer started for ${session.taskTitle}!`);
  };

  if (loading) {
    return (
      <div className="studymap-card-elevated">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Today's Schedule
          </h3>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const completedCount = sessions.filter((s) => s.completed).length;

  // Group sessions by task
  const sessionsByTask = sessions.reduce((acc, session) => {
    if (!acc[session.taskId]) {
      acc[session.taskId] = [];
    }
    acc[session.taskId].push(session);
    return acc;
  }, {} as Record<string, TodaySession[]>);

  return (
    <div className="studymap-card-elevated">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Today & Tomorrow
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {completedCount}/{sessions.length} completed
          </span>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No study sessions scheduled for today or tomorrow</p>
          <p className="text-xs mt-2">Create a task to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(sessionsByTask).map(([taskId, taskSessions]) => {
            const firstSession = taskSessions[0];
            const isImminent = firstSession.dueDate && differenceInDays(
              firstSession.dueDate instanceof Date ? firstSession.dueDate : new Date(firstSession.dueDate),
              new Date()
            ) <= 1;
            
            return (
              <div key={taskId} className={`rounded-lg border-2 overflow-hidden transition-colors ${
                isImminent 
                  ? "border-red-500 bg-red-50 dark:bg-red-950/20" 
                  : "border-muted bg-card"
              }`}>
                {/* Task Header with Countdown */}
                <div className={`p-3 flex items-center justify-between ${
                  isImminent ? "bg-red-100/50 dark:bg-red-900/30" : "bg-muted/30"
                }`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">
                      {firstSession.taskTitle}
                    </p>
                    {firstSession.dueDate && (
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(firstSession.dueDate instanceof Date ? firstSession.dueDate : new Date(firstSession.dueDate), "MMM d")}
                        </span>
                        {daysUntilDue[taskId] !== undefined && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            daysUntilDue[taskId] <= 1
                              ? "bg-red-500 text-white animate-pulse"
                              : daysUntilDue[taskId] <= 3
                              ? "bg-yellow-500 text-white"
                              : "bg-green-500 text-white"
                          }`}>
                            {daysUntilDue[taskId] === 0 ? "🔴 DUE TODAY" : daysUntilDue[taskId] === 1 ? "🟡 TOMORROW" : `${daysUntilDue[taskId]}d left`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveTask(taskId)}
                    title="Delete entire task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Sessions List */}
                <div className="space-y-2 p-3">
                  {taskSessions.map((session, i) => {
                    const isActiveSession = currentSession?.id === session.sessionId;
                    const isTomorrow = differenceInDays(session.sessionDate, new Date()) >= 1;
                    
                    return (
                      <motion.div
                        key={`${session.taskId}-${session.sessionDate.toISOString()}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-center gap-3 p-2 rounded border transition-colors ${
                          isActiveSession
                            ? "border-primary bg-primary/10"
                            : session.completed
                            ? "opacity-60 bg-muted/30 border-muted"
                            : isTomorrow
                            ? "border-muted bg-muted/20"
                            : "border-muted bg-background hover:bg-muted/20"
                        }`}
                      >
                        <button
                          onClick={() => toggleComplete(session.taskId, session.sessionId, session.completed)}
                          className="flex-shrink-0 cursor-pointer"
                        >
                          {session.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              session.completed
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {session.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs">
                              {SUBJECT_ICONS[session.subject as keyof typeof SUBJECT_ICONS] || "📘"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatSessionDuration(session.duration)}
                            </span>
                            {isTomorrow && (
                              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                Tomorrow
                              </span>
                            )}
                            {isActiveSession && (
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                isRunning && !isPaused 
                                  ? "bg-red-500 text-white animate-pulse" 
                                  : isPaused 
                                  ? "bg-yellow-500 text-white"
                                  : "bg-gray-500 text-white"
                              }`}>
                                {isRunning && !isPaused ? "🔴" : isPaused ? "⏸️" : "⏹️"} {formatTime(timeRemaining)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1 shrink-0">
                          {!session.completed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleFocusMode(session)}
                            >
                              <Focus className="w-3 h-3 mr-1" />
                              Focus
                            </Button>
                          )}
                          {isActiveSession ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => (isPaused ? resumeTimer() : pauseTimer())}
                                title={isPaused ? "Resume" : "Pause"}
                              >
                                {isPaused ? (
                                  <Play className="w-3 h-3 text-primary" />
                                ) : (
                                  <Pause className="w-3 h-3 text-primary" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={stopTimer}
                                title="Stop"
                              >
                                <Square className="w-3 h-3 text-destructive" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleStartSession(session)}
                              disabled={currentSession !== null && currentSession.id !== session.sessionId}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Start
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 shrink-0 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteSession(session.taskId, session.sessionId)}
                            title="Delete session"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {focusModeSession && (
        <FocusModeTimer 
          session={focusModeSession} 
          onClose={handleCloseFocusMode} 
        />
      )}
    </div>
  );
}
