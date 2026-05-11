import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTaskContext } from "@/context/TaskContext";
import { differenceInDays } from "date-fns";

const TYPE_LABELS: Record<string, string> = {
  exam:       "Exam",
  assignment: "Assignment",
  quiz:       "Quiz",
  project:    "Project",
  study:      "Study",
};

function getUrgencyColor(level: string) {
  switch (level) {
    case "red":    return "border-red-500 bg-red-50 dark:bg-red-950/20";
    case "yellow": return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
    default:       return "border-green-500 bg-green-50 dark:bg-green-950/20";
  }
}

function getScoreColor(rate: number) {
  if (rate >= 0.8) return "text-green-600";
  if (rate >= 0.6) return "text-yellow-600";
  return "text-red-600";
}

function getBarColor(rate: number) {
  if (rate >= 0.8) return "bg-green-500";
  if (rate >= 0.6) return "bg-yellow-500";
  return "bg-red-500";
}

const TrendIcon = ({ rate }: { rate: number }) => {
  if (rate >= 0.8) return <TrendingUp className="w-3.5 h-3.5 text-green-600" />;
  if (rate >= 0.6) return <TrendingDown className="w-3.5 h-3.5 text-yellow-600" />;
  return <Minus className="w-3.5 h-3.5 text-red-600" />;
};

export function ReadinessCards() {
  const { tasks, getTaskUrgencies } = useTaskContext();
  const urgencies = getTaskUrgencies();

  const readinessData = tasks
    .filter(task => !task.completed)
    .map(task => {
      const total     = task.studySessions.length;
      const completed = task.studySessions.filter(s => s.completed).length;
      const rate      = total > 0 ? completed / total : 0;
      const daysLeft  = differenceInDays(task.dueDate, new Date());
      const urgency   = urgencies.find(u => u.taskId === task.id);

      return {
        taskName:  task.title,
        taskType:  TYPE_LABELS[task.type] ?? task.type,
        rate,
        daysLeft:  Math.max(0, daysLeft),
        urgency:   urgency?.level ?? "green",
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 4);

  return (
    <div className="studymap-card-elevated">
      <h3 className="text-lg font-semibold text-foreground mb-4">Study Readiness</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {readinessData.map((item, i) => (
          <motion.div
            key={`${item.taskName}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`p-3 rounded-lg border ${getUrgencyColor(item.urgency)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 mr-2">
                {/* Task title is the primary label — never shows "Other" */}
                <p className="text-sm font-semibold text-foreground truncate">{item.taskName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.taskType} · {item.daysLeft === 0 ? "due today" : `${item.daysLeft}d left`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <TrendIcon rate={item.rate} />
                <span className={`text-xl font-bold leading-none ${getScoreColor(item.rate)}`}>
                  {Math.round(item.rate * 100)}%
                </span>
              </div>
            </div>

            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${getBarColor(item.rate)}`}
                initial={{ width: 0 }}
                animate={{ width: `${item.rate * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              />
            </div>
          </motion.div>
        ))}

        {readinessData.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <p className="text-sm">No active study tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}
