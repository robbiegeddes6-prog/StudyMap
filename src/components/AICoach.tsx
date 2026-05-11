import { useState } from "react";
import { useTaskContext } from "@/context/TaskContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function AICoach() {
  const { getAICoachSummary, applyAICoachAdjustments } = useTaskContext();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // Simulate analysis time
    setTimeout(() => {
      const summary = getAICoachSummary();
      if (summary.missedSessions > 0) {
        applyAICoachAdjustments();
        toast.success("AI Coach adjustments applied!", {
          description: summary.message
        });
      } else {
        toast.info("AI Coach analysis complete", {
          description: summary.message
        });
      }
      setIsAnalyzing(false);
    }, 1000);
  };

  const summary = getAICoachSummary();

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Study Coach
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm">{summary.missedSessions} missed sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm">{Math.round(summary.completionRate * 100)}% completion rate</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">{summary.daysRemaining} days avg remaining</span>
            </div>
          </div>
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            variant="outline"
            size="sm"
          >
            {isAnalyzing ? "Analyzing..." : "Run AI Coach"}
          </Button>
        </div>

        {summary.adjustments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recommended Adjustments:</h4>
            {summary.adjustments.map((adjustment, index) => (
              <div key={index} className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                • {adjustment}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-muted/30 rounded-md">
          <p className="text-sm text-muted-foreground">{summary.message}</p>
        </div>
      </CardContent>
    </Card>
  );
}