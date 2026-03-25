import { useMemo } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function generateMockData() {
  const weeks = 4;
  const data: number[][] = [];
  for (let w = 0; w < weeks; w++) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(Math.random() > 0.2 ? Math.floor(Math.random() * 5) : 0);
    }
    data.push(week);
  }
  return data;
}

function getCellClass(value: number): string {
  if (value === 0) return "bg-muted";
  if (value <= 1) return "studymap-heatmap-light opacity-60";
  if (value <= 2) return "studymap-heatmap-light";
  if (value <= 3) return "studymap-heatmap-moderate";
  return "studymap-heatmap-heavy";
}

export function PressureMap() {
  const data = useMemo(generateMockData, []);

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
        {data.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 flex-1">
            {week.map((val, di) => (
              <div
                key={di}
                className={`h-7 rounded-md transition-colors ${getCellClass(val)}`}
                title={`${val} hours`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
