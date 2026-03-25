import { Clock, CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  subject: string;
  duration: string;
  completed: boolean;
  type: "study" | "exam" | "assignment";
}

const mockSchedule: ScheduleItem[] = [
  { id: "1", time: "9:00 AM", title: "Review Chapter 5", subject: "Economics", duration: "45 min", completed: true, type: "study" },
  { id: "2", time: "10:00 AM", title: "Problem Set 3", subject: "Calculus", duration: "60 min", completed: true, type: "assignment" },
  { id: "3", time: "1:00 PM", title: "Study Cell Biology", subject: "Biology", duration: "50 min", completed: false, type: "study" },
  { id: "4", time: "3:00 PM", title: "Essay Draft", subject: "English", duration: "90 min", completed: false, type: "assignment" },
  { id: "5", time: "5:00 PM", title: "Practice Problems", subject: "Physics", duration: "45 min", completed: false, type: "study" },
];

const typeColors: Record<string, string> = {
  study: "bg-primary/10 text-primary",
  exam: "bg-destructive/10 text-destructive",
  assignment: "bg-accent/10 text-accent",
};

export function TodaySchedule() {
  return (
    <div className="studymap-card-elevated">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Today's Schedule</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>5 sessions</span>
        </div>
      </div>
      <div className="space-y-3">
        {mockSchedule.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-lg border border-border/50 transition-colors hover:bg-muted/50 ${item.completed ? "opacity-60" : ""}`}
          >
            {item.completed ? (
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors[item.type]}`}>
                  {item.subject}
                </span>
                <span className="text-xs text-muted-foreground">{item.duration}</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{item.time}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
