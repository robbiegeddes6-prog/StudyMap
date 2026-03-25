import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { toast } from "sonner";

type Exam = {
  id: string;
  name: string;
  subject: string;
  exam_date: string;
  difficulty: string;
  weight: number | null;
};

const empty = { name: "", subject: "", exam_date: "", difficulty: "medium", weight: "" };

export default function Exams() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const fetch = async () => {
    if (!user) return;
    const { data } = await supabase.from("exams").select("*").eq("user_id", user.id).order("exam_date");
    if (data) setExams(data);
  };

  useEffect(() => { fetch(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.name || !form.subject || !form.exam_date) return;
    const payload = {
      name: form.name,
      subject: form.subject,
      exam_date: form.exam_date,
      difficulty: form.difficulty,
      weight: form.weight ? parseFloat(form.weight) : null,
      user_id: user.id,
    };
    if (editing) {
      await supabase.from("exams").update(payload).eq("id", editing);
      toast.success("Exam updated");
    } else {
      await supabase.from("exams").insert(payload);
      toast.success("Exam added");
    }
    setOpen(false);
    setEditing(null);
    setForm(empty);
    fetch();
  };

  const handleEdit = (exam: Exam) => {
    setEditing(exam.id);
    setForm({ name: exam.name, subject: exam.subject, exam_date: exam.exam_date.slice(0, 16), difficulty: exam.difficulty, weight: exam.weight?.toString() || "" });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("exams").delete().eq("id", id);
    toast.success("Exam deleted");
    fetch();
  };

  const diffColor = (d: string) => d === "hard" ? "destructive" : d === "medium" ? "default" : "secondary";

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exams</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your upcoming exams</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />Add Exam</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Exam" : "Add Exam"}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Midterm Exam" /></div>
                <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Biology" /></div>
                <div><Label>Date</Label><Input type="datetime-local" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} /></div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Weight (%)</Label><Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="25" /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {exams.length === 0 ? (
          <div className="studymap-card-elevated flex flex-col items-center py-12 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No exams yet. Add your first exam to get started.</p>
          </div>
        ) : (
          <div className="studymap-card-elevated overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.name}</TableCell>
                    <TableCell>{exam.subject}</TableCell>
                    <TableCell>{format(new Date(exam.exam_date), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell><Badge variant={diffColor(exam.difficulty)}>{exam.difficulty}</Badge></TableCell>
                    <TableCell>{exam.weight ? `${exam.weight}%` : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(exam)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
