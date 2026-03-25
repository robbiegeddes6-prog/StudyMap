import { motion } from "framer-motion";
import { Clock, Flame, Target, BookCheck } from "lucide-react";

const stats = [
  { label: "Study Hours", value: "12.5", icon: Clock, suffix: "hrs this week" },
  { label: "Streak", value: "7", icon: Flame, suffix: "days" },
  { label: "Completion", value: "68%", icon: Target, suffix: "of sessions" },
  { label: "Exams Ready", value: "2/4", icon: BookCheck, suffix: "above 75%" },
];

export function StatsRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
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
