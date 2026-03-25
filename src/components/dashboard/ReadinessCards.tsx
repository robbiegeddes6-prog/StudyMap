import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ReadinessItem {
  subject: string;
  examName: string;
  score: number;
  trend: "up" | "down" | "stable";
  daysLeft: number;
}

const mockReadiness: ReadinessItem[] = [
  { subject: "Economics", examName: "Midterm", score: 78, trend: "up", daysLeft: 5 },
  { subject: "Calculus", examName: "Final", score: 62, trend: "up", daysLeft: 12 },
  { subject: "Biology", examName: "Quiz 3", score: 45, trend: "down", daysLeft: 3 },
  { subject: "Physics", examName: "Lab Exam", score: 88, trend: "stable", daysLeft: 8 },
];

function getScoreColor(score: number) {
  if (score >= 75) return "text-primary";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

function getBarColor(score: number) {
  if (score >= 75) return "bg-primary";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-primary" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
};

export function ReadinessCards() {
  return (
    <div className="studymap-card-elevated">
      <h3 className="text-lg font-semibold text-foreground mb-4">AI Readiness Score</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mockReadiness.map((item, i) => (
          <motion.div
            key={item.subject}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="p-3 rounded-lg border border-border/50 bg-muted/30"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-foreground">{item.subject}</p>
                <p className="text-xs text-muted-foreground">{item.examName} · {item.daysLeft}d left</p>
              </div>
              <div className="flex items-center gap-1">
                <TrendIcon trend={item.trend} />
                <span className={`text-xl font-bold ${getScoreColor(item.score)}`}>
                  {item.score}%
                </span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${getBarColor(item.score)}`}
                initial={{ width: 0 }}
                animate={{ width: `${item.score}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
