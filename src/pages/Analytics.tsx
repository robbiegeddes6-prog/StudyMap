import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, TrendingUp, Zap, BookOpen, Flame, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AnalyticsData } from "@/types";

const FOCUS_SESSIONS_STORAGE_KEY = 'studymap-focus-sessions';

const Analytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    todayStudyTime: 2.5,
    weekStudyTime: 18.75,
    longestSession: 1.5,
    mostStudiedSubject: "math",
    completionRate: 85,
    tasksDueToday: 3,
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch focus sessions from localStorage
      const focusSessions = JSON.parse(localStorage.getItem(FOCUS_SESSIONS_STORAGE_KEY) || '[]');

      // Filter sessions from the last 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentSessions = focusSessions.filter((session: any) =>
        new Date(session.created_at || session.start_time) > weekAgo
      );

      let weekTotalMinutes = 0;
      let longestSessionMinutes = 0;

      if (recentSessions) {
        recentSessions.forEach((session: any) => {
          const duration = session.duration_minutes || session.duration || 0;
          weekTotalMinutes += duration;
          longestSessionMinutes = Math.max(longestSessionMinutes, duration);
        });
      }

      // Fetch assignments from localStorage to calculate completion rate
      const assignments = JSON.parse(localStorage.getItem('studybuddy_tasks') || '[]');

      let completedCount = 0;
      if (assignments) {
        completedCount = assignments.filter((a: any) => a.completed).length;
      }
      const completionRate =
        assignments && assignments.length > 0
          ? Math.round((completedCount / assignments.length) * 100)
          : 0;

      // Calculate today's study time
      const today = new Date().toISOString().split("T")[0];
      const todaySessions = focusSessions.filter((session: any) => {
        const sessionDate = new Date(session.created_at || session.start_time).toISOString().split("T")[0];
        return sessionDate === today;
      });

      let todayMinutes = 0;
      if (todaySessions) {
        todaySessions.forEach((session: any) => {
          todayMinutes += session.duration_minutes || session.duration || 0;
        });
      }

      setAnalytics((prev) => ({
        ...prev,
        weekStudyTime: weekTotalMinutes / 60,
        todayStudyTime: todayMinutes / 60,
        longestSession: longestSessionMinutes / 60,
        completionRate,
      }));
    } catch (err) {
      console.error("Failed to load analytics:", err);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    unit = "",
    color = "text-primary",
    delay = 0,
  }: {
    icon: typeof BarChart3;
    label: string;
    value: string | number;
    unit?: string;
    color?: string;
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="studymap-card-elevated"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-2">
            {value}
            {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
          </p>
        </div>
        <div className={`p-3 rounded-lg bg-primary/10`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your study progress and insights
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={BookOpen}
            label="Study Time Today"
            value={analytics.todayStudyTime.toFixed(1)}
            unit="hours"
            delay={0}
          />
          <StatCard
            icon={TrendingUp}
            label="Weekly Study Time"
            value={analytics.weekStudyTime.toFixed(1)}
            unit="hours"
            delay={0.1}
          />
          <StatCard
            icon={Zap}
            label="Longest Focus Session"
            value={analytics.longestSession.toFixed(1)}
            unit="hours"
            delay={0.2}
          />
          <StatCard
            icon={CheckCircle2}
            label="Completion Rate"
            value={analytics.completionRate}
            unit="%"
            color="text-green-500"
            delay={0.3}
          />
          <StatCard
            icon={Flame}
            label="Tasks Due Today"
            value={analytics.tasksDueToday}
            color="text-orange-500"
            delay={0.4}
          />
          <StatCard
            icon={TrendingUp}
            label="Overdue Tasks"
            value={analytics.overdueCount}
            color="text-destructive"
            delay={0.5}
          />
        </div>

        {/* Study Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="studymap-card-elevated"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Weekly Breakdown
          </h3>
          <div className="space-y-3">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
              (day, i) => {
                const hours = Math.random() * 5 + 0.5;
                return (
                  <div key={day} className="flex items-center justify-between">
                    <span className="text-sm text-foreground w-20">{day}</span>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-muted rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(hours / 5) * 100}%` }}
                          transition={{ delay: 0.7 + i * 0.05 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {hours.toFixed(1)}h
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </motion.div>

        {/* Subject Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="studymap-card-elevated"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Most Studied Subjects
          </h3>
          <div className="space-y-3">
            {[
              { subject: "Math 📐", percentage: 35 },
              { subject: "Biology 🧬", percentage: 25 },
              { subject: "Physics ⚛️", percentage: 20 },
              { subject: "English 📚", percentage: 15 },
              { subject: "Chemistry 🧪", percentage: 5 },
            ].map(({ subject, percentage }, i) => (
              <div key={subject} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{subject}</span>
                <div className="flex-1 mx-4 flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.9 + i * 0.05 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground w-8 text-right">
                  {percentage}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
