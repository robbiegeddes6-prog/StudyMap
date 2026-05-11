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

export function QuickInput() {
  const [input, setInput] = useState("");
  const [taskType, setTaskType] = useState<SharedTaskType>("assignment");
  const [dueDate, setDueDate] = useState("");
  const [hoursPreset, setHoursPreset] = useState("moderate");
  const [customHours, setCustomHours] = useState("");
  const [loading, setLoading] = useState(false);

  const { addTask, tasks } = useTaskContext();

  const getTotalHours = () => {
    if (hoursPreset === "custom" && customHours) {
      const hours = parseFloat(customHours);
      return isNaN(hours) ? 4 : hours;
    }
    switch (hoursPreset) {
      case "light": return 4; // 3-5 hours
      case "moderate": return 8; // 6-10 hours
      case "heavy": return 15; // 10-20 hours
      default: return 4;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !dueDate || loading) return;

    setLoading(true);
    try {
      const parsed = parseQuickAdd(input, taskType, "medium"); // Keep for backward compatibility
      const dueDateObj = new Date(dueDate);
      if (isNaN(dueDateObj.getTime())) {
        toast.error("Invalid due date");
        return;
      }

      const totalHours = getTotalHours();

      // Generate study plan with sessions
      const taskId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      const schedule = generateStudySchedule({
        id: taskId,
        title: cleanTaskTitle(input),
        type: taskType,
        dueDate: dueDateObj,
        totalHours,
      });

      // Use cleanTaskTitle for the task
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
          taskId: taskId,
          title: s.title,
          duration: s.duration,
          date: s.date,
          completed: s.completed,
        })),
      };

      await addTask(task);

      const daysUntilDue = Math.max(
        0,
        Math.round(
          (dueDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      console.log("🔧 Quick Add: New task created", { newTask: task, allTasks: tasks });

      toast.success(`✅ "${cleanTitle}" added!`, {
        description: `${TASK_TYPE_LABELS[taskType]} · ${totalHours}h · Due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`,
      });

      setInput("");
      setTaskType("assignment");
      setDueDate("");
      setHoursPreset("moderate");
      setCustomHours("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to process. Please try again.";
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
            <p className="text-sm text-muted-foreground max-w-2xl">Create a task and schedule it instantly with one simple form.</p>
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
              <Label className="text-xs text-muted-foreground">Study Hours</Label>
              <Select value={hoursPreset} onValueChange={setHoursPreset}>
                <SelectTrigger className="h-11 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light (3–5 H)</SelectItem>
                  <SelectItem value="moderate">Moderate (6–10 H)</SelectItem>
                  <SelectItem value="heavy">Heavy (10–20 H)</SelectItem>
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

        <Button type="submit" disabled={!input.trim() || !dueDate || loading} className="w-full">
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
