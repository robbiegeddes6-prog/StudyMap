import { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2, CheckCircle2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { addDays } from "date-fns";
import { parseQuickAdd, generateStudySchedule, cleanTaskTitle, parseSyllabusContent, TaskTypeKey } from "@/lib/studyUtils";
import { useTaskContext } from "@/context/TaskContext";

type ReviewTaskType = "assignment" | "exam" | "quiz" | "project" | "other";
type Priority = "low" | "medium" | "high";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "uploading" | "processing" | "success" | "error";
  error?: string;
}

interface ParsedReviewTask {
  id: string;
  title: string;
  type: ReviewTaskType;
  dueDate: string;
  estimatedHours: number;
  priority: Priority;
  daysBeforeStart: number;
  spreadDays: number;
  subject: string;
  sourceFile: string;
}

function mapSubjectKeyToSubject(key: string): string {
  switch (key.toLowerCase()) {
    case "math": return "math";
    case "biology": return "biology";
    case "physics": return "physics";
    case "chemistry": return "chemistry";
    case "english": return "english";
    case "history": return "history";
    case "art": return "art";
    default: return "other";
  }
}

function mapParsedType(taskType: TaskTypeKey): ReviewTaskType {
  switch (taskType) {
    case "Exam": return "exam";
    case "Quiz": return "quiz";
    case "Project": return "project";
    default: return "assignment";
  }
}

function formatDateInput(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
  return date.toISOString().split("T")[0];
}

async function readFileContent(file: File): Promise<string> {
  if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || "");
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }
  return file.name.replace(/\.[^/.]+$/, "");
}

export function FileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawFilesRef = useRef<Map<string, File>>(new Map());
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [reviewTasks, setReviewTasks] = useState<ParsedReviewTask[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const { addTask, tasks } = useTaskContext();

  useEffect(() => {
    if (!isReviewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev || "auto"; };
  }, [isReviewOpen]);

  const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "text/plain"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];

    Array.from(selectedFiles).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not supported. Please upload PDF, images, or text files.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        return;
      }
      newFiles.push({ name: file.name, size: file.size, type: file.type, progress: 0, status: "uploading" });
      rawFilesRef.current.set(file.name, file);
    });

    if (newFiles.length === 0) return;

    setFiles(newFiles);
    setIsScanning(true);

    const parsedReviewItems: ParsedReviewTask[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const rawFile = rawFilesRef.current.get(newFiles[i].name);
      if (rawFile) {
        const fileTasks = await processFile(newFiles[i], i, rawFile);
        parsedReviewItems.push(...fileTasks);
      }
    }

    setIsScanning(false);

    if (parsedReviewItems.length > 0) {
      setReviewTasks(parsedReviewItems);
      setIsReviewOpen(true);
    } else {
      toast("No tasks were detected from the uploaded files.", {
        description: "Review the file content or try a different upload.",
      });
    }
  };

  const processFile = async (
    file: UploadedFile,
    index: number,
    rawFile: File
  ): Promise<ParsedReviewTask[]> => {
    try {
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise((resolve) => setTimeout(resolve, 120));
        setFiles((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], progress };
          return updated;
        });
      }

      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: "processing", progress: 100 };
        return updated;
      });

      const fileContent = await readFileContent(rawFile);
      await new Promise((resolve) => setTimeout(resolve, 600));

      const parsedTasks = parseSyllabusContent(fileContent);
      const reviewItems: ParsedReviewTask[] = [];

      if (parsedTasks.length === 0) {
        const filenameKey = rawFile.name.replace(/\.[^/.]+$/, "");
        const parsed = parseQuickAdd(filenameKey, "", "");
        reviewItems.push({
          id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          title: cleanTaskTitle(parsed.title || filenameKey),
          type: mapParsedType(parsed.type),
          dueDate: parsed.date || formatDateInput(addDays(new Date(), 5)),
          estimatedHours: 5,
          priority: "medium",
          daysBeforeStart: 3,
          spreadDays: 2,
          subject: mapSubjectKeyToSubject(parsed.subject),
          sourceFile: file.name,
        });
      } else {
        for (const taskEntry of parsedTasks) {
          reviewItems.push({
            id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            title: taskEntry.title,
            type: mapParsedType(taskEntry.type),
            dueDate: formatDateInput(taskEntry.dueDate),
            estimatedHours: taskEntry.estimatedHours,
            priority: "medium",
            daysBeforeStart: 3,
            spreadDays: 2,
            subject: mapSubjectKeyToSubject(taskEntry.subject),
            sourceFile: file.name,
          });
        }
      }

      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: "success" };
        return updated;
      });

      return reviewItems;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process file";
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: "error", error: errorMessage };
        return updated;
      });
      toast.error(`Failed to process ${rawFile.name}`);
      return [];
    }
  };

  const updateReviewTask = (id: string, updates: Partial<ParsedReviewTask>) => {
    setReviewTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const totalReviewHours = reviewTasks.reduce((sum, t) => sum + t.estimatedHours, 0);

  const handleAddToStudyMap = async () => {
    if (reviewTasks.length === 0) {
      toast.error("No tasks to add.");
      return;
    }

    for (const task of reviewTasks) {
      const taskId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

      // Use same generateStudySchedule as QuickAdd
      const schedule = generateStudySchedule({
        id: taskId,
        title: task.title,
        type: task.type,
        dueDate: task.dueDate,
        totalHours: task.estimatedHours,
        daysBeforeStart: task.daysBeforeStart,
        spreadDays: task.spreadDays,
      });

      await addTask({
        id: taskId,
        title: task.title,
        subject: task.subject,
        type: task.type,
        totalHours: task.estimatedHours,
        dueDate: new Date(task.dueDate),
        completed: false,
        studySessions: schedule.map((s) => ({
          id: s.id,
          taskId,
          title: s.title,
          duration: s.duration,
          date: s.date,
          completed: false,
        })),
      });

      console.log("🔧 File Upload: New task created", { newTask: task, allTasks: tasks });
    }

    setIsReviewOpen(false);
    setReviewTasks([]);
    setFiles([]);

    toast.success(
      `${reviewTasks.length} task${reviewTasks.length > 1 ? "s" : ""} added to StudyMap!`,
      { description: `${totalReviewHours}h of study time scheduled.` }
    );
  };

  const handleCancel = () => {
    setIsReviewOpen(false);
    setIsScanning(false);
    setReviewTasks([]);
    setFiles([]);
    rawFilesRef.current.clear();
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <>
      {/* Upload Card */}
      <div className="studymap-card-elevated">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Upload Files</h3>
        </div>

        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-6 cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.txt"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <div className="text-center">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, images, or text files (max 10MB)</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          📎 Upload assignment PDFs, lecture notes, or images to automatically parse and create tasks.
        </p>
      </div>

      {/* Scanning Overlay */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <ScanSearch className="w-10 h-10 text-primary" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary"
                />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Scanning your file…</h3>
                <p className="text-sm text-muted-foreground">
                  Detecting tasks, due dates, and workload
                </p>
              </div>

              <div className="w-full space-y-2">
                {files.map((file, i) => (
                  <div key={file.name + i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/60">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      <div className="w-full bg-muted rounded-full h-1 mt-1.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${file.progress}%` }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>
                    {file.status === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review & Confirm Modal */}
      <AnimatePresence>
        {isReviewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="bg-white w-full max-w-4xl h-[92vh] rounded-2xl shadow-lg flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-primary">Scan Complete</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">
                      Confirm & Edit Details
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Review each detected task, adjust details, then add to your StudyMap.
                    </p>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="rounded-full border border-border/70 bg-white p-2 text-muted-foreground hover:border-destructive hover:text-destructive transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Task list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="rounded-3xl border border-border/70 bg-muted/70 p-4 text-sm text-foreground">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-medium">Total Study Time:</span>
                    <span className="text-primary font-semibold">
                      {totalReviewHours}h across {reviewTasks.length} task{reviewTasks.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  {reviewTasks.map((task) => (
                    <div key={task.id} className="rounded-3xl border border-border/70 bg-background p-5 shadow-sm space-y-5">
                      {/* Row 1: Title + Type + Due date */}
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                        <div className="flex-1 min-w-0">
                          <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Assignment Title
                          </Label>
                          <Input
                            value={task.title}
                            onChange={(e) => updateReviewTask(task.id, { title: e.target.value })}
                            className="mt-2 w-full"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3 lg:w-80">
                          <div>
                            <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Type
                            </Label>
                            <Select
                              value={task.type}
                              onValueChange={(v) =>
                                updateReviewTask(task.id, { type: v as ReviewTaskType })
                              }
                            >
                              <SelectTrigger className="mt-2 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="assignment">Assignment</SelectItem>
                                <SelectItem value="exam">Exam</SelectItem>
                                <SelectItem value="quiz">Quiz</SelectItem>
                                <SelectItem value="project">Project</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Due Date
                            </Label>
                            <Input
                              type="date"
                              value={task.dueDate}
                              onChange={(e) => updateReviewTask(task.id, { dueDate: e.target.value })}
                              className="mt-2 w-full"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Hours + Priority */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Estimated Time (hours)
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={task.estimatedHours}
                            onChange={(e) =>
                              updateReviewTask(task.id, { estimatedHours: Number(e.target.value) })
                            }
                            className="mt-2 w-full"
                          />
                          <div className="flex flex-wrap gap-2 mt-2">
                            {[2, 5, 10].map((h) => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => updateReviewTask(task.id, { estimatedHours: h })}
                                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                  task.estimatedHours === h
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-white text-foreground hover:border-primary"
                                }`}
                              >
                                {h}h
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Priority
                          </Label>
                          <div className="mt-2 flex gap-2">
                            {(["low", "medium", "high"] as Priority[]).map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => updateReviewTask(task.id, { priority: p })}
                                className={`flex-1 rounded-full border px-3 py-2 text-sm capitalize transition ${
                                  task.priority === p
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-white text-foreground hover:border-primary"
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Scheduling preferences */}
                      <div className="grid gap-4 md:grid-cols-2 pt-3 border-t border-border/50">
                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Days before due date to start
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={task.daysBeforeStart}
                            onChange={(e) =>
                              updateReviewTask(task.id, {
                                daysBeforeStart: Math.max(1, parseInt(e.target.value) || 1),
                              })
                            }
                            className="mt-2 w-full"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Spread work across how many days
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={task.spreadDays}
                            onChange={(e) =>
                              updateReviewTask(task.id, {
                                spreadDays: Math.max(1, parseInt(e.target.value) || 1),
                              })
                            }
                            className="mt-2 w-full"
                          />
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">Source: {task.sourceFile}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t shrink-0 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddToStudyMap}
                  className="bg-green-500 text-white hover:bg-green-600"
                >
                  Add to StudyMap
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
