import { useTaskContext } from "@/context/TaskContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, TrendingUp } from "lucide-react";
import { formatSessionDuration } from "@/lib/studyUtils";

export function DailyPlanSummary() {
  const { getTodayStudySessions, getAICoachSummary } = useTaskContext();
  const todaySessions = getTodayStudySessions();
  const coachSummary = getAICoachSummary();

  const totalSessions = todaySessions.length;
  const totalMinutes = todaySessions.reduce((sum, session) => sum + session.duration, 0);
  const completedSessions = todaySessions.filter(s => s.completed).length;

  const performanceMessage = coachSummary.completionRate > 0.8 
    ? "Excellent progress!" 
    : coachSummary.completionRate > 0.6 
    ? "Good progress" 
    : "Consider increasing study time";

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Daily Plan Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{totalSessions} sessions</p>
              <p className="text-xs text-muted-foreground">{formatSessionDuration(totalMinutes)} total</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{completedSessions}/{totalSessions} completed</p>
              <p className="text-xs text-muted-foreground">{Math.round((completedSessions/totalSessions)*100) || 0}% done</p>
            </div>
          </div>

          <div>
            <Badge variant={coachSummary.completionRate > 0.8 ? "default" : coachSummary.completionRate > 0.6 ? "secondary" : "destructive"}>
              {performanceMessage}
            </Badge>
          </div>
        </div>

        {coachSummary.message && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            {coachSummary.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}