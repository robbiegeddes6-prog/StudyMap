import { useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { parseQuickAdd, generateStudySchedule, cleanTaskTitle } from "@/lib/studyUtils";
import { SharedTaskType, useTaskContext } from "@/context/TaskContext";
import { TASK_TYPE_LABELS } from "@/types";

// Maps mode → default spread days (determines session count)
const MODE_SPREAD_DAYS: Record<string, number> = {
  light: 2,    // 1-2 sessions
  moderate: 4, // 3-6 sessions
  heavy: 8,    // 7-10 sessions
  custom: 2,
};

export function QuickInput() {
  const [input, setInput] = useState("");
  const [taskType, setTaskType] = useState<SharedTaskType>("assignment");
  const [dueDate, setDueDate] = useState("");
  const [hoursPreset, setHoursPreset] = useState("moderate");
  const [customHours, setCustomHours] = useState("");
  const [daysBeforeStart, setDaysBeforeStart] = useState(3);
  const [spreadDays, setSpreadDays] = useState(MODE_SPREAD_DAYS["moderate"]);
  const [loading, setLoading] = useState(false);

  const { addTask, tasks } = useTaskContext();

  const getTotalHours = () => {
    if (hoursPreset === "custom" && customHours) {
      const hours = parseFloat(customHours);
      return isNaN(hours) ? 4 : hours;
    }
    switch (hoursPreset) {
      case "light": return 4;
      case "moderate": return 8;
      case "heavy": return 15;
      default: return 4;
    }
  };

  const handleModeChange = (mode: string) => {
    setHoursPreset(mode);
    setSpreadDays(MODE_SPREAD_DAYS[mode] ?? 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !dueDate || loading) return;

    setLoading(true);
    try {
      const parsed = parseQuickAdd(input, taskType, "medium");
      const dueDateObj = new Date(dueDate);
      if (isNaN(dueDateObj.getTime())) {
        toast.error("Invalid due date");
        return;
      }

      const totalHours = getTotalHours();
      const taskId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      const schedule = generateStudySchedule({
        id: taskId,
        title: cleanTaskTitle(input),
        type: taskType,
        dueDate: dueDateObj,
        totalHours,
        daysBeforeStart,
        spreadDays,
      });

      const cleanTitle = cleanTaskTitle(input);

      const task = {
        title: cleanTitle,
        subject: parsed.subject.toLowerCase(),
        type: taskType,
        totalHours,
        dueDate: dueDateObj,
        completed: false,
        studySessions: schedule.map((s) => ({
          id: s.id,
          taskId,
          title: s.title,
          duration: s.duration,
          date: s.date,
          completed: s.completed,
        })),
      };

      await addTask(task);

      const daysUntilDue = Math.max(
        0,
        Math.round((dueDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      );

      console.log("🔧 Quick Add: New task created", { newTask: task, allTasks: tasks });

      toast.success(`✅ "${cleanTitle}" added!`, {
        description: `${TASK_TYPE_LABELS[taskType]} · ${totalHours}h · ${schedule.length} session${schedule.length !== 1 ? "s" : ""} · Due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`,
      });

      setInput("");
      setTaskType("assignment");
      setDueDate("");
      setHoursPreset("moderate");
      setCustomHours("");
      setDaysBeforeStart(3);
      setSpreadDays(MODE_SPREAD_DAYS["moderate"]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process. Please try again.";
      console.error("Error:", err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="studymap-card-elevated">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 mb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="w-4 h-4" />
            Smart task builder
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Quick Add Task</h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Create a task and schedule it instantly with one simple form.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Use a clear task name, due date, and hours estimate. Your study plan updates immediately.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="E.g., Physics midterm exam"
          disabled={loading}
          autoFocus
          className="min-h-[46px]"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Due Date</Label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Task Type</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as SharedTaskType)}>
                <SelectTrigger className="h-11 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="study">Study</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Study Load</Label>
              <Select value={hoursPreset} onValueChange={handleModeChange}>
                <SelectTrigger className="h-11 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light (1–2 sessions)</SelectItem>
                  <SelectItem value="moderate">Moderate (3–6 sessions)</SelectItem>
                  <SelectItem value="heavy">Heavy (7–10 sessions)</SelectItem>
                  <SelectItem value="custom">Custom Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {hoursPreset === "custom" && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Custom Hours</Label>
            <Input
              type="number"
              value={customHours}
              onChange={(e) => setCustomHours(e.target.value)}
              placeholder="Enter hours (e.g., 7.5)"
              min="0.5"
              step="0.5"
              disabled={loading}
            />
          </div>
        )}

        {/* Per-task scheduling preferences */}
        <div className="grid gap-3 sm:grid-cols-2 pt-1 border-t border-border/50">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Days before due date to start
            </Label>
            <Input
              type="number"
              value={daysBeforeStart}
              onChange={(e) =>
                setDaysBeforeStart(Math.max(1, parseInt(e.target.value) || 1))
              }
              min="1"
              disabled={loading}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Spread work across how many days
            </Label>
            <Input
              type="number"
              value={spreadDays}
              onChange={(e) =>
                setSpreadDays(Math.max(1, parseInt(e.target.value) || 1))
              }
              min="1"
              disabled={loading}
              className="h-11"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={!input.trim() || !dueDate || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating task...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Add Task & Schedule
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
