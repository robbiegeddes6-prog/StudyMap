import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, ClipboardList, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  priority: string;
  estimated_hours: number | null;
  completed: boolean | null;
};

const empty = { name: "", due_date: "", priority: "medium", estimated_hours: "" };

export default function Assignments() {
  const { user } = useAuth();
  const [items, setItems] = useState<Assignment[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const fetchData = async () => {
    if (!user) return;
    const { data } = await supabase.from("assignments").select("*").eq("user_id", user.id).order("due_date");
    if (data) setItems(data);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.name || !form.due_date) return;
    const payload = {
      name: form.name,
      due_date: form.due_date,
      priority: form.priority,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      user_id: user.id,
    };
    if (editing) {
      await supabase.from("assignments").update(payload).eq("id", editing);
      toast.success("Assignment updated");
    } else {
      await supabase.from("assignments").insert(payload);
      toast.success("Assignment added");
    }
    setOpen(false);
    setEditing(null);
    setForm(empty);
    fetchData();
  };

  const handleEdit = (a: Assignment) => {
    setEditing(a.id);
    setForm({ name: a.name, due_date: a.due_date.slice(0, 16), priority: a.priority, estimated_hours: a.estimated_hours?.toString() || "" });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("assignments").delete().eq("id", id);
    toast.success("Assignment deleted");
    fetchData();
  };

  const toggleComplete = async (a: Assignment) => {
    await supabase.from("assignments").update({ completed: !a.completed }).eq("id", a.id);
    fetchData();
  };

  const prioColor = (p: string) => p === "high" ? "destructive" : p === "medium" ? "default" : "secondary";

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assignments</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your assignments and deadlines</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />Add Assignment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Assignment" : "Add Assignment"}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Lab Report #3" /></div>
                <div><Label>Due Date</Label><Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Estimated Hours</Label><Input type="number" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} placeholder="2" /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {items.length === 0 ? (
          <div className="studymap-card-elevated flex flex-col items-center py-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No assignments yet. Add your first one to get started.</p>
          </div>
        ) : (
          <div className="studymap-card-elevated overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">Done</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id} className={a.completed ? "opacity-50" : ""}>
                    <TableCell>
                      <Checkbox checked={!!a.completed} onCheckedChange={() => toggleComplete(a)} />
                    </TableCell>
                    <TableCell className={`font-medium ${a.completed ? "line-through" : ""}`}>{a.name}</TableCell>
                    <TableCell>{format(new Date(a.due_date), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell><Badge variant={prioColor(a.priority)}>{a.priority}</Badge></TableCell>
                    <TableCell>{a.estimated_hours ? `${a.estimated_hours}h` : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
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
