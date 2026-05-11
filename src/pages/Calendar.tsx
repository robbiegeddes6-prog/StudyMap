import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
import { useTaskContext } from "@/context/TaskContext";
import { generateStudySchedule } from "@/lib/studyUtils";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: "exam" | "assignment" | "session";
};

const typeColor = (type: string) => {
  switch (type) {
    case "exam": return "destructive";
    case "assignment": return "default";
    case "session": return "secondary";
    default: return "outline";
  }
};

export default function Calendar() {
  const { user } = useAuth();
  const { tasks, removeTask, updateTask, getTaskUrgencies } = useTaskContext();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [open, setOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<{ title: string; date: string; type: "exam" | "assignment" }>({ title: "", date: "", type: "assignment" });
  const [editOpen, setEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<{ id: string; name: string; due_date: string; totalHours: number } | null>(null);
  const [editForm, setEditForm] = useState({ name: "", due_date: "", totalHours: 4 });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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

    // Add study sessions from context (only individual sessions for calendar grid)
    tasks?.forEach((task) => {
      task?.studySessions?.forEach((session) => {
        if (session?.date) {
          mapped.push({
            id: session.id,
            title: session.title || `Study ${task.title || "Session"}`,
            date: format(session.date, "yyyy-MM-dd"),
            type: "session" as const,
          });
        }
      });
    });

    setEvents(mapped);
  };

  useEffect(() => { fetchEvents(); }, [user, tasks]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const selectedDayTasks = selectedDay ? tasks.filter((task) => isSameDay(task.dueDate, selectedDay)) : [];
  const selectedDaySessions = selectedDay ? tasks.flatMap((task) =>
    task.studySessions
      .filter((session) => isSameDay(session.date, selectedDay))
      .map((session) => ({ ...session, taskTitle: task.title, subject: task.subject }))
  ) : [];
  const selectedDayTotal = selectedDaySessions.reduce((sum, s) => sum + s.duration, 0);

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

  const handleEdit = (task: { id: string; title: string; dueDate: Date; totalHours: number }) => {
    setEditingTask(task);
    setEditForm({
      name: task.title,
      due_date: task.dueDate.toISOString().slice(0, 16),
      totalHours: task.totalHours
    });
    setEditOpen(true);
  };

  const handleEditSave = () => {
    if (!editingTask || !editForm.name || !editForm.due_date) return;

    const dueDate = new Date(editForm.due_date);
    if (isNaN(dueDate.getTime())) {
      toast.error("Invalid due date");
      return;
    }

    const totalHours = editForm.totalHours || 4;

    // Generate new study schedule
    const schedule = generateStudySchedule({
      id: editingTask.id,
      title: editForm.name,
      type: editingTask.type,
      dueDate: dueDate,
      totalHours,
    });

    const taskUpdates = {
      title: editForm.name,
      dueDate,
      totalHours,
      studySessions: schedule?.map((s) => ({
        id: s.id,
        taskId: editingTask.id,
        title: s.title,
        duration: s.duration,
        date: s.date,
        completed: false,
      })) || [],
    };

    updateTask(editingTask.id, taskUpdates);
    toast.success("Task updated successfully");
    setEditOpen(false);
    setEditingTask(null);
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

          {/* Edit Task Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Task name" /></div>
                <div><Label>Due Date</Label><Input type="datetime-local" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} /></div>
                <div><Label>Total Hours</Label><Input type="number" value={editForm.totalHours} onChange={(e) => setEditForm({ ...editForm, totalHours: Number(e.target.value) || 4 })} placeholder="4" min="0.5" step="0.5" /></div>
                <Button onClick={handleEditSave} className="w-full">Update Task</Button>
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
            
            // Check if any task has a due date on this day
            const dueDateTasks = tasks?.filter(task => 
              task.dueDate && isSameDay(task.dueDate, day) && !task.completed
            ) || [];
            const hasDueDate = dueDateTasks.length > 0;
            
            // Get urgency level for the day
            const dayUrgencies = getTaskUrgencies().filter(u => {
              const task = tasks.find(t => t.id === u.taskId);
              return task && task.studySessions.some(s => isSameDay(s.date, day));
            });
            const highestUrgency = dayUrgencies.reduce((max, curr) => 
              curr.level === "red" ? curr : max.level === "red" ? max : curr, 
              { level: "green" as const }
            );
            
            const urgencyClass = highestUrgency.level === "red" 
              ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
              : highestUrgency.level === "yellow"
              ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
              : "";
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={`studymap-card min-h-[140px] text-left cursor-pointer ${isToday ? "ring-2 ring-primary/40" : ""} ${hasDueDate ? "border-l-4 border-l-red-500" : ""} ${urgencyClass}`}>
                <div className={`text-xs font-medium mb-2 flex items-center justify-between ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  <span>{format(day, "EEE d")}</span>
                  {hasDueDate && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0 h-5">
                      📌 {dueDateTasks.map((t) => t.title).join(", ")} Due
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {dayEvents.map((ev) => (
                    <Badge key={ev.id} variant={typeColor(ev.type)} className="text-[10px] block truncate">
                      {ev.title}
                    </Badge>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <Dialog open={!!selectedDay} onOpenChange={(isOpen) => { if (!isOpen) setSelectedDay(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedDay ? `Details for ${format(selectedDay, "PPP")}` : "Day details"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Total study time: {selectedDayTotal} minutes</p>
              {selectedDayTasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold">Tasks due today</h4>
                  <ul className="list-disc list-inside text-sm">
                    {selectedDayTasks.map((task) => (
                      <li key={task.id}>{task.title}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedDaySessions.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold">Study sessions</h4>
                  <ul className="list-disc list-inside text-sm">
                    {selectedDaySessions.map((session) => (
                      <li key={session.id}>{session.taskTitle} – {session.duration} minutes</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No sessions scheduled for this day.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Study Overview Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Study Overview</h2>
          <div className="space-y-3">
            {tasks
              ?.filter(task => !task.completed)
              ?.reduce((grouped, task) => {
                const incompleteSessions = task.studySessions.filter(s => !s.completed);
                if (incompleteSessions.length === 0) return grouped;
                
                const key = `${task.subject} ${task.type}`;
                if (!grouped[key]) {
                  grouped[key] = [];
                }
                grouped[key].push(task);
                return grouped;
              }, {} as Record<string, typeof tasks>)
              ? Object.entries(
                  tasks
                    ?.filter(task => !task.completed)
                    ?.reduce((grouped, task) => {
                      const incompleteSessions = task.studySessions.filter(s => !s.completed);
                      if (incompleteSessions.length === 0) return grouped;
                      
                      const key = `${task.subject} ${task.type}`;
                      if (!grouped[key]) {
                        grouped[key] = [];
                      }
                      grouped[key].push(task);
                      return grouped;
                    }, {} as Record<string, typeof tasks>) || {}
                ).map(([groupKey, groupTasks]) => {
                  const totalSessions = groupTasks.reduce((sum, task) => 
                    sum + task.studySessions.filter(s => !s.completed).length, 0
                  );
                  
                  return (
                    <div key={groupKey} className="studymap-card-elevated p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium text-foreground">
                          {groupKey} – {totalSessions} sessions left
                        </div>
                      </div>
                      <div className="space-y-2">
                        {groupTasks.map(task => {
                          const incompleteSessions = task.studySessions.filter(s => !s.completed);
                          const urgency = getTaskUrgencies().find(u => u.taskId === task.id);
                          
                          return (
                            <div key={task.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-foreground">{task.title}</span>
                                <Badge 
                                  variant={urgency?.level === "red" ? "destructive" : urgency?.level === "yellow" ? "secondary" : "outline"}
                                  className="text-xs"
                                >
                                  {incompleteSessions.length} left
                                </Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(task)}>
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                  removeTask(task.id);
                                  toast.success(`Deleted "${task.title}"`);
                                }} className="text-destructive hover:text-destructive">
                                  Delete
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              : null}
            {tasks?.filter(task => !task.completed && task.studySessions.filter(s => !s.completed).length > 0).length === 0 && (
              <div className="studymap-card-elevated flex items-center justify-center py-8 text-muted-foreground">
                <p className="text-sm">No upcoming study sessions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
