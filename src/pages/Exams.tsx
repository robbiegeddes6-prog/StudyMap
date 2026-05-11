import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useTaskContext } from "@/context/TaskContext";
import { generateStudySchedule } from "@/lib/studyUtils";
import { toast } from "sonner";

type Exam = {
  id: string;
  name: string;
  subject: string;
  exam_date: string;
  totalHours: number;
  weight: number | null;
};

const empty = { name: "", subject: "", exam_date: "", totalHours: 8, weight: "" };

export default function Exams() {
  const { tasks, addTask, updateTask, removeTask } = useTaskContext();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  // Filter exams from centralized tasks
  const exams = tasks.filter(task =>
    task.type === "exam" || task.type === "quiz"
  );

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.exam_date) return;

    const dueDate = new Date(form.exam_date);
    if (isNaN(dueDate.getTime())) {
      toast.error("Invalid exam date");
      return;
    }

    const totalHours = form.totalHours || 8;
    const taskId = editing || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

    const schedule = generateStudySchedule({
      id: taskId,
      title: form.name,
      type: "exam",
      dueDate: dueDate,
      totalHours,
    });

    const taskUpdates = {
      title: form.name,
      subject: form.subject.toLowerCase(),
      type: "exam" as const,
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
      toast.success("Exam updated");
    } else {
      await addTask(taskUpdates);
      toast.success("Exam added");
    }

    console.log("🔧 Exams Page: New task created", { newTask: taskUpdates, allTasks: tasks });

    setOpen(false);
    setEditing(null);
    setForm(empty);
  };

  const handleEdit = (exam: any) => {
    setEditing(exam.id);
    setForm({
      name: exam.title,
      subject: exam.subject,
      exam_date: exam.dueDate.toISOString().slice(0, 16),
      totalHours: exam.totalHours,
      weight: exam.weight?.toString() || ""
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    removeTask(id);
    toast.success("Exam deleted");
  };

  const diffColor = (d: string) => d === "hard" ? "destructive" : d === "medium" ? "default" : "secondary";

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="studymap-card-elevated p-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Exams</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your upcoming exams and keep your study plan on track.</p>
            </div>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty); } }}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2"><Plus className="w-4 h-4" />Add Exam</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Exam" : "Add Exam"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Midterm Exam" />
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Biology" />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="datetime-local" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Total Hours</Label>
                    <Input type="number" value={form.totalHours} onChange={(e) => setForm({ ...form, totalHours: Number(e.target.value) || 8 })} placeholder="8" min="0.5" step="0.5" />
                  </div>
                  <div>
                    <Label>Weight (%)</Label>
                    <Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="25" />
                  </div>
                  <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-muted/50 py-16 text-center">
              <GraduationCap className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">No exams yet</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Add your first exam to immediately generate a study plan and keep your prep organized.
              </p>
            </div>
          ) : (
            <div className="studymap-card-elevated overflow-hidden p-0">
              <Table>
                <TableHeader className="bg-muted/70">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{exam.title}</TableCell>
                      <TableCell className="capitalize">{exam.subject}</TableCell>
                      <TableCell>{format(new Date(exam.dueDate), "MMM d, yyyy h:mm a")}</TableCell>
                      <TableCell>{exam.totalHours}h</TableCell>
                      <TableCell>{exam.weight ? `${exam.weight}%` : "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(exam)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)} className="text-destructive hover:text-destructive">
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
