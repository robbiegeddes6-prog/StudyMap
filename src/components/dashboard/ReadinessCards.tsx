import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTaskContext } from "@/context/TaskContext";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function ReadinessCards() {
  const { tasks } = useTaskContext();

  const { score, noData } = useMemo(() => {
    const allCompleted = tasks
      .flatMap(t => t.studySessions)
      .filter(s => s.completed);

    let hasFlashcards = false;
    try {
      const cards = JSON.parse(localStorage.getItem("studyCards") || "[]");
      hasFlashcards = Array.isArray(cards) && cards.length > 0;
    } catch {}

    const hasAnyActivity =
      allCompleted.length > 0 ||
      hasFlashcards ||
      Boolean(localStorage.getItem("studymap_quiz_result"));

    if (!hasAnyActivity) return { score: 50, noData: true };

    let s = 50;

    // +10% per completed hour of study, capped at +40%
    const completedHours = allCompleted.reduce((sum, session) => sum + session.duration / 60, 0);
    s += Math.min(40, Math.floor(completedHours) * 10);

    // -15% if latest quiz score is below 60%
    try {
      const q = JSON.parse(localStorage.getItem("studymap_quiz_result") || "null");
      if (q && typeof q.pct === "number" && q.pct < 60) s -= 15;
    } catch {}

    // -10% if more than half of rated flashcards are "hard"
    try {
      const cards: Array<{ difficulty?: string }> = JSON.parse(
        localStorage.getItem("studyCards") || "[]"
      );
      const rated = cards.filter(c => c.difficulty);
      if (rated.length > 0) {
        const hardCount = rated.filter(c => c.difficulty === "hard").length;
        if (hardCount / rated.length > 0.5) s -= 10;
      }
    } catch {}

    // +10% if a study session was completed in the last 24 hours
    const oneDayAgo = Date.now() - 86_400_000;
    const studiedRecently = allCompleted.some(session => {
      const d = session.date instanceof Date ? session.date : new Date(session.date as string);
      return d.getTime() >= oneDayAgo;
    });
    if (studiedRecently) s += 10;

    // +5% if flashcard streak is 3 or more
    try {
      const streak = parseInt(localStorage.getItem("studymap_flashcard_streak") ?? "0", 10);
      if (streak >= 3) s += 5;
    } catch {}

    return { score: clamp(s, 5, 99), noData: false };
  }, [tasks]);

  const color =
    score >= 70 ? "text-green-600" :
    score >= 50 ? "text-yellow-600" :
    "text-red-600";

  const barColor =
    score >= 70 ? "bg-green-500" :
    score >= 50 ? "bg-yellow-500" :
    "bg-red-500";

  const label =
    score >= 80 ? "Great shape!" :
    score >= 60 ? "On track" :
    score >= 40 ? "Needs more work" :
    "Falling behind";

  return (
    <div className="studymap-card-elevated">
      <h3 className="text-lg font-semibold text-foreground mb-4">Study Readiness</h3>

      {noData ? (
        <div className="text-center py-6">
          <p className="text-4xl font-bold text-foreground mb-2">50%</p>
          <p className="text-sm text-muted-foreground">
            Start studying to get your readiness score
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className={`text-4xl font-bold leading-none ${color}`}>{score}%</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </div>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${barColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Based on sessions completed, quiz scores &amp; flashcard progress
          </p>
        </div>
      )}
    </div>
  );
}
