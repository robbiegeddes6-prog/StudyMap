import { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2, CheckCircle2, ScanSearch, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";
import { generateStudySchedule } from "@/lib/studyUtils";
import { useTaskContext } from "@/context/TaskContext";

// Set the PDF.js worker once at module load time
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

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
  weight?: string;
}

interface AITaskResult {
  title: string;
  type: string;
  dueDate: string;
  weight?: string;
  estimatedHours: number;
}

function mapAIType(type: string): ReviewTaskType {
  const lower = (type || "").toLowerCase();
  if (lower === "exam") return "exam";
  if (lower === "quiz") return "quiz";
  if (lower === "project") return "project";
  if (lower === "assignment") return "assignment";
  return "other";
}

function safeDateInput(dateStr: string): string {
  if (!dateStr) return fallbackDate();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? fallbackDate() : d.toISOString().split("T")[0];
}

function fallbackDate(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function daysBeforeForPriority(p: Priority): number {
  return p === "high" ? 14 : p === "medium" ? 5 : 2;
}

async function extractPDFText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text +=
      content.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .join(" ") + "\n";
  }
  return text.trim();
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
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    return extractPDFText(file);
  }
  return "";
}

async function callParseSyllabus(content: string): Promise<AITaskResult[]> {
  const res = await fetch("/api/parse-syllabus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.tasks) ? (data.tasks as AITaskResult[]) : [];
}

export function FileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawFilesRef = useRef<Map<string, File>>(new Map());
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [reviewTasks, setReviewTasks] = useState<ParsedReviewTask[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);
  const [sourceFileName, setSourceFileName] = useState("");
  const { addTask } = useTaskContext();

  useEffect(() => {
    if (!isReviewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev || "auto"; };
  }, [isReviewOpen]);

  const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "text/plain"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  function makeEmptyTask(sourceFile: string): ParsedReviewTask {
    return {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      title: "",
      type: "assignment",
      dueDate: fallbackDate(),
      estimatedHours: 3,
      priority: "medium",
      daysBeforeStart: daysBeforeForPriority("medium"),
      spreadDays: 3,
      subject: "other",
      sourceFile,
    };
  }

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
    setParseFailed(false);

    const parsedItems: ParsedReviewTask[] = [];
    const fileNames: string[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const rawFile = rawFilesRef.current.get(newFiles[i].name);
      if (rawFile) {
        fileNames.push(rawFile.name);
        const fileTasks = await processFile(newFiles[i], i, rawFile);
        parsedItems.push(...fileTasks);
      }
    }

    setIsScanning(false);
    setSourceFileName(
      fileNames.length === 1 ? fileNames[0] : `${fileNames.length} files`
    );

    if (parsedItems.length > 0) {
      setReviewTasks(parsedItems);
      setParseFailed(false);
    } else {
      setParseFailed(true);
      setReviewTasks([makeEmptyTask(fileNames[0] || "Uploaded file")]);
    }
    setIsReviewOpen(true);
  };

  const processFile = async (
    file: UploadedFile,
    index: number,
    rawFile: File
  ): Promise<ParsedReviewTask[]> => {
    const updateProgress = (progress: number, status?: UploadedFile["status"]) =>
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], progress, ...(status ? { status } : {}) };
        return updated;
      });

    try {
      for (let p = 10; p <= 30; p += 10) {
        await new Promise((r) => setTimeout(r, 80));
        updateProgress(p);
      }
      updateProgress(40, "processing");

      const fileContent = await readFileContent(rawFile);
      updateProgress(70);

      if (!fileContent.trim()) {
        updateProgress(100, "success");
        return [];
      }

      const aiTasks = await callParseSyllabus(fileContent);
      updateProgress(100, "success");

      if (aiTasks.length === 0) return [];

      return aiTasks.map((task): ParsedReviewTask => ({
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        title: task.title || "",
        type: mapAIType(task.type),
        dueDate: safeDateInput(task.dueDate),
        estimatedHours:
          typeof task.estimatedHours === "number" && task.estimatedHours > 0
            ? task.estimatedHours
            : 3,
        priority: "medium",
        daysBeforeStart: daysBeforeForPriority("medium"),
        spreadDays: 3,
        subject: "other",
        sourceFile: file.name,
        weight: task.weight,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to process file";
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: "error", error: msg };
        return updated;
      });
      toast.error(`Failed to process ${rawFile.name}: ${msg}`);
      return [];
    }
  };

  const updateReviewTask = (id: string, updates: Partial<ParsedReviewTask>) => {
    setReviewTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const merged = { ...t, ...updates };
        if (updates.priority !== undefined && updates.daysBeforeStart === undefined) {
          merged.daysBeforeStart = daysBeforeForPriority(updates.priority);
        }
        return merged;
      })
    );
  };

  const removeReviewTask = (id: string) => {
    setReviewTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const totalReviewHours = reviewTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

  const handleAddToStudyMap = async () => {
    const tasksToAdd = reviewTasks.filter((t) => t.title.trim());
    if (tasksToAdd.length === 0) {
      toast.error("Please enter a title for at least one task.");
      return;
    }

    for (const task of tasksToAdd) {
      const taskId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
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
    }

    const count = tasksToAdd.length;
    setIsReviewOpen(false);
    setReviewTasks([]);
    setFiles([]);
    setParseFailed(false);
    rawFilesRef.current.clear();

    toast.success(
      `${count} task${count !== 1 ? "s" : ""} added to StudyMap!`,
      { description: `${totalReviewHours}h of study time scheduled.` }
    );
  };

  const handleCancel = () => {
    setIsReviewOpen(false);
    setIsScanning(false);
    setReviewTasks([]);
    setFiles([]);
    setParseFailed(false);
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
          📎 Upload a syllabus PDF to automatically detect all tasks and deadlines.
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
                  Using AI to detect tasks, due dates, and workload
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
                    ) : file.status === "error" ? (
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm uppercase tracking-[0.3em] text-primary">Scan Complete</p>
                    {parseFailed ? (
                      <>
                        <h2 className="mt-2 text-2xl font-semibold text-foreground">
                          Enter Task Manually
                        </h2>
                        <div className="mt-2 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>We couldn't auto-detect tasks — please enter manually</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="mt-2 text-xl font-semibold text-foreground truncate">
                          Found {reviewTasks.length} task{reviewTasks.length !== 1 ? "s" : ""} in {sourceFileName}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Review and edit details, delete any you don't want, then add all to StudyMap.
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleCancel}
                    className="rounded-full border border-border/70 bg-white p-2 text-muted-foreground hover:border-destructive hover:text-destructive transition shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Task list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!parseFailed && reviewTasks.length > 0 && (
                  <div className="rounded-2xl border border-border/70 bg-muted/50 px-4 py-3 text-sm">
                    <span className="font-semibold text-foreground">
                      {reviewTasks.length} task{reviewTasks.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}· {totalReviewHours}h total estimated study time
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  {reviewTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-3xl border border-border/70 bg-background p-5 shadow-sm space-y-5"
                    >
                      {/* Title row + delete button */}
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Title
                          </Label>
                          <Input
                            value={task.title}
                            onChange={(e) => updateReviewTask(task.id, { title: e.target.value })}
                            placeholder="Task title…"
                            className="mt-2 w-full"
                          />
                        </div>
                        {!parseFailed && (
                          <button
                            onClick={() => removeReviewTask(task.id)}
                            title="Remove this task"
                            className="mt-7 shrink-0 rounded-full border border-border/70 p-2 text-muted-foreground hover:border-destructive hover:text-destructive transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Type + Due Date + Weight */}
                      <div className={`grid gap-3 ${task.weight ? "grid-cols-3" : "grid-cols-2"}`}>
                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Type
                          </Label>
                          <Select
                            value={task.type}
                            onValueChange={(v) => updateReviewTask(task.id, { type: v as ReviewTaskType })}
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
                        {task.weight && (
                          <div>
                            <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Weight
                            </Label>
                            <div className="mt-2 h-10 flex items-center px-3 rounded-md border border-border bg-muted/40 text-sm font-medium text-foreground">
                              Worth {task.weight}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Estimated Hours + Priority */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Estimated Hours
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={task.estimatedHours}
                            onChange={(e) =>
                              updateReviewTask(task.id, {
                                estimatedHours: Math.max(1, Number(e.target.value)),
                              })
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
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {task.priority === "high"
                              ? "Starts 14 days before due"
                              : task.priority === "medium"
                              ? "Starts 5 days before due"
                              : "Starts 2 days before due"}
                          </p>
                        </div>
                      </div>

                      {/* Scheduling preferences */}
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
                            Spread across how many days
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
                  disabled={reviewTasks.length === 0}
                  className="bg-green-500 text-white hover:bg-green-600"
                >
                  Add All to StudyMap
                  {reviewTasks.length > 0 && ` (${reviewTasks.length})`}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
