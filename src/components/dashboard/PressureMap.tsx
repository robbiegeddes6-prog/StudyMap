import { useMemo } from "react";
import { useTaskContext } from "@/context/TaskContext";
import { format, addDays, isSameDay, startOfWeek } from "date-fns";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface PressureDayData {
  date: Date;
  totalMinutes: number;
  dueTasks: string[];
  sessions: string[];
}

function getCellClass(totalMinutes: number): string {
  if (totalMinutes === 0) return "bg-muted";
  if (totalMinutes <= 30) return "studymap-heatmap-light opacity-80";
  if (totalMinutes <= 60) return "studymap-heatmap-light";
  if (totalMinutes <= 120) return "studymap-heatmap-moderate";
  return "studymap-heatmap-heavy";
}

export function PressureMap() {
  const { tasks } = useTaskContext();

  const calendarStart = useMemo(() => {
    const today = new Date();
    return startOfWeek(addDays(today, -7), { weekStartsOn: 1 });
  }, []);

  const weekData = useMemo(() => {
    const arranged: PressureDayData[][] = [];

    for (let weekIdx = 0; weekIdx < 4; weekIdx++) {
      const week: PressureDayData[] = [];
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const date = addDays(calendarStart, weekIdx * 7 + dayIdx);

        const dueTasks = tasks
          .filter((task) => task.dueDate && isSameDay(task.dueDate, date) && !task.completed)
          .map((task) => task.title);

        const sessions = tasks.flatMap((task) =>
          task.studySessions
            .filter((session) => session.date && isSameDay(session.date, date))
            .map((session) => `${task.title}: ${session.title} (${session.duration}m)`)
        );

        const totalMinutes = sessions.reduce((sum, s) => {
          const minutesMatch = s.match(/\((\d+)m\)$/);
          return sum + (minutesMatch ? Number(minutesMatch[1]) : 0);
        }, 0) + dueTasks.length * 30;

        week.push({ date, totalMinutes, dueTasks, sessions });
      }
      arranged.push(week);
    }

    return arranged;
  }, [tasks, calendarStart]);

  return (
    <div className="studymap-card-elevated">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Pressure Map</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm studymap-heatmap-light" />
            <span>Light</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm studymap-heatmap-moderate" />
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm studymap-heatmap-heavy" />
            <span>Heavy</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1">
        <div className="flex flex-col gap-1 mr-2 pt-0">
          {DAYS.map((day) => (
            <div key={day} className="h-7 flex items-center text-xs text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {weekData.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 flex-1">
            {week.map((day, di) => {
              const tooltip = `${format(day.date, "eee, MMM d")}\n` +
                `Total load: ${Math.round(day.totalMinutes / 60 * 10) / 10}h\n` +
                `Due tasks: ${day.dueTasks.length}\n` +
                `Sessions: ${day.sessions.length}` +
                (day.dueTasks.length ? `\nDue: ${day.dueTasks.join(", ")}` : "") +
                (day.sessions.length ? `\n${day.sessions.join("\n")}` : "");

              return (
                <div
                  key={di}
                  className={`h-7 rounded-md transition-colors cursor-help ${getCellClass(day.totalMinutes)}`}
                  title={tooltip}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
