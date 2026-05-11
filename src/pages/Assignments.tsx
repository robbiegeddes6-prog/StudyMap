import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, ClipboardList, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTaskContext, SharedTaskType } from "@/context/TaskContext";
import { generateStudySchedule, cleanTaskTitle } from "@/lib/studyUtils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Assignment = {
  id: string;
  name: string;
  due_date: string;
  totalHours: number;
  completed: boolean | null;
};

const empty = { name: "", due_date: "", totalHours: 4 };

export default function Assignments() {
  const { tasks, addTask, updateTask, removeTask, toggleTaskComplete } = useTaskContext();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const assignments = tasks.filter((t) => t.type === "assignment");

  const handleSave = async () => {
    if (!form.name || !form.due_date) return;

    const dueDate = new Date(form.due_date);
    if (isNaN(dueDate.getTime())) {
      toast.error("Invalid due date");
      return;
    }

    const totalHours = form.totalHours || 4;

    // Use cleanTaskTitle for better naming
    const cleanTitle = cleanTaskTitle(form.name);

    const taskId = editing || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

    const schedule = generateStudySchedule({
      id: taskId,
      title: cleanTitle,
      type: "assignment",
      dueDate: dueDate,
      totalHours,
    });

    const taskUpdates = {
      title: cleanTitle,
      subject: "other",
      type: "assignment" as const,
      totalHours,
      dueDate,
      completed: false,
      studySessions: schedule?.map((s) => ({
        id: s.id,
        taskId: taskId,
        title: s.title,
        duration: s.duration,
        date: s.date,
        completed: s.completed,
      })) || [],
    };

    if (editing) {
      updateTask(editing, taskUpdates);
    } else {
      await addTask(taskUpdates);
    }

    console.log("🔧 Assignments Page: New task created", { newTask: taskUpdates, allTasks: tasks });

    toast.success(editing ? "Assignment updated" : "Assignment added");
    setOpen(false);
    setEditing(null);
    setForm(empty);
  };

  const handleEdit = (a) => {
    setEditing(a.id);
    setForm({ name: a.title, due_date: a.dueDate.toISOString().slice(0, 16), totalHours: a.totalHours });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    removeTask(id);
    toast.success("Assignment deleted");
  };

  const toggleComplete = (a) => {
    toggleTaskComplete(a.id);
  };

  const prioColor = (p: string) => p === "high" ? "destructive" : p === "medium" ? "default" : "secondary";

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="studymap-card-elevated p-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Assignments</h1>
              <p className="text-sm text-muted-foreground mt-1">Track your assignments, deadlines, and study time in one clean view.</p>
            </div>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty); } }}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2"><Plus className="w-4 h-4" />Add Assignment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Assignment" : "Add Assignment"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Lab Report #3" />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Total Hours</Label>
                    <Input type="number" value={form.totalHours} onChange={(e) => setForm({ ...form, totalHours: Number(e.target.value) || 4 })} placeholder="4" min="0.5" step="0.5" />
                  </div>
                  <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-muted/50 py-16 text-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">No assignments yet</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Add your first assignment to see it immediately on your schedule and generate sessions automatically.
              </p>
            </div>
          ) : (
            <div className="studymap-card-elevated overflow-hidden p-0">
              <Table>
                <TableHeader className="bg-muted/70">
                  <TableRow>
                    <TableHead className="w-[40px]">Done</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id} className={`${a.completed ? "opacity-60" : "hover:bg-muted/50"}`}>
                      <TableCell>
                        <Checkbox checked={a.completed} onCheckedChange={() => toggleComplete(a)} />
                      </TableCell>
                      <TableCell className={`font-medium ${a.completed ? "line-through text-muted-foreground" : ""}`}>{a.title}</TableCell>
                      <TableCell>{format(new Date(a.dueDate), "MMM d, yyyy h:mm a")}</TableCell>
                      <TableCell>{a.totalHours}h</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
