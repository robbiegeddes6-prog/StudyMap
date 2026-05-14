import { motion } from "framer-motion";
import { Clock, Flame, Target, BookCheck } from "lucide-react";
import { useUserStatsContext } from "@/context/UserStatsContext";
import { useTaskContext } from "@/context/TaskContext";

export function StatsRow() {
  const { stats, loading } = useUserStatsContext();
  const { tasks } = useTaskContext();

  const totalSessions = tasks.reduce((sum, t) => sum + t.studySessions.length, 0);
  const completedSessions = tasks.reduce(
    (sum, t) => sum + t.studySessions.filter((s) => s.completed).length,
    0
  );
  const completionRate =
    totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  const examTasks = tasks.filter((t) => t.type === "exam");
  const readyExams = examTasks.filter((t) => {
    const total = t.studySessions.length;
    const done = t.studySessions.filter((s) => s.completed).length;
    return total > 0 && done / total >= 0.75;
  }).length;

  const hoursDisplay = loading
    ? "--"
    : stats.total_study_hours > 0
    ? stats.total_study_hours.toFixed(1)
    : "0";

  const streakDisplay = loading ? "--" : String(stats.current_streak);

  const statsData = [
    { label: "Study Hours", value: hoursDisplay, icon: Clock, suffix: "hrs total" },
    { label: "Streak", value: streakDisplay, icon: Flame, suffix: "days" },
    { label: "Completion", value: `${completionRate}%`, icon: Target, suffix: "of sessions" },
    {
      label: "Exams Ready",
      value: examTasks.length > 0 ? `${readyExams}/${examTasks.length}` : "--",
      icon: BookCheck,
      suffix: "above 75%",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {statsData.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="studymap-card flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <stat.icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.suffix}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
