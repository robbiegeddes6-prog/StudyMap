import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: "exam" | "assignment" | "session";
};

export default function Calendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [open, setOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", type: "assignment" as const });

  const fetchEvents = async () => {
    if (!user) return;
    const [exams, assignments, sessions] = await Promise.all([
      supabase.from("exams").select("id, name, exam_date").eq("user_id", user.id),
      supabase.from("assignments").select("id, name, due_date").eq("user_id", user.id),
      supabase.from("study_sessions").select("id, date, duration_minutes").eq("user_id", user.id),
    ]);

    const mapped: CalendarEvent[] = [
      ...(exams.data?.map((e) => ({ id: e.id, title: e.name, date: e.exam_date, type: "exam" as const })) || []),
      ...(assignments.data?.map((a) => ({ id: a.id, title: a.name, date: a.due_date, type: "assignment" as const })) || []),
      ...(sessions.data?.map((s) => ({ id: s.id, title: `Study ${s.duration_minutes}min`, date: s.date, type: "session" as const })) || []),
    ];
    setEvents(mapped);
  };

  useEffect(() => { fetchEvents(); }, [user]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleAdd = async () => {
    if (!user || !newEvent.title || !newEvent.date) return;
    if (newEvent.type === "exam") {
      await supabase.from("exams").insert({ name: newEvent.title, exam_date: newEvent.date, subject: "General", user_id: user.id });
    } else {
      await supabase.from("assignments").insert({ name: newEvent.title, due_date: newEvent.date, user_id: user.id });
    }
    toast.success("Event added!");
    setOpen(false);
    setNewEvent({ title: "", date: "", type: "assignment" });
    fetchEvents();
  };

  const typeColor = (t: string) => {
    if (t === "exam") return "destructive";
    if (t === "assignment") return "default";
    return "secondary";
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">Your academic schedule at a glance</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />Add Event</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Title</Label><Input value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Event name" /></div>
                <div><Label>Date</Label><Input type="datetime-local" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={newEvent.type} onValueChange={(v) => setNewEvent({ ...newEvent, type: v as "exam" | "assignment" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} className="w-full">Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium text-foreground">{format(days[0], "MMM d")} – {format(days[6], "MMM d, yyyy")}</span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayEvents = events.filter((e) => {
              try { return isSameDay(parseISO(e.date), day); } catch { return false; }
            });
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className={`studymap-card min-h-[140px] ${isToday ? "ring-2 ring-primary/40" : ""}`}>
                <div className={`text-xs font-medium mb-2 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {format(day, "EEE d")}
                </div>
                <div className="space-y-1">
                  {dayEvents.map((ev) => (
                    <Badge key={ev.id} variant={typeColor(ev.type)} className="text-[10px] block truncate">
                      {ev.title}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
