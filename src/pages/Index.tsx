import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { TodaySchedule } from "@/components/dashboard/TodaySchedule";
import { PressureMap } from "@/components/dashboard/PressureMap";
import { ReadinessCards } from "@/components/dashboard/ReadinessCards";
import { StartNowButton } from "@/components/dashboard/StartNowButton";
import { QuickInput } from "@/components/dashboard/QuickInput";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your study overview for today</p>
        </div>

        <StatsRow />

        <QuickInput />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TodaySchedule />
            <PressureMap />
          </div>
          <div className="space-y-6">
            <StartNowButton />
            <ReadinessCards />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
